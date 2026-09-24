require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database setup
const db = new Database(path.join(__dirname, 'crm.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'employee', 'leader')),
    leader_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leaders (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    telegram_chat_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pilgrims (
    id TEXT PRIMARY KEY,
    folder_number TEXT,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    birth_date TEXT,
    passport_expiry TEXT,
    phone TEXT,
    total_amount REAL DEFAULT 0,
    leader_id TEXT NOT NULL,
    comments TEXT,
    additional_comments TEXT,
    document_status TEXT DEFAULT 'incomplete',
    payment_status TEXT DEFAULT 'not_paid',
    upload_status TEXT DEFAULT '',
    is_archived INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (leader_id) REFERENCES leaders(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    pilgrim_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('photo', 'passport', 'registration', 'foreign_passport')),
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT,
    storage_path TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    uploaded_by TEXT,
    FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    UNIQUE(pilgrim_id, type)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    pilgrim_id TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_at TEXT DEFAULT (datetime('now')),
    paid_by TEXT,
    method TEXT DEFAULT 'cash',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    pilgrim_id TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    amount REAL NOT NULL,
    pilgrim_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    object_name TEXT,
    user_id TEXT,
    user_name TEXT,
    old_value TEXT,
    new_value TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS telegram_notifications (
    id TEXT PRIMARY KEY,
    leader_id TEXT NOT NULL,
    pilgrim_id TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (leader_id) REFERENCES leaders(id),
    FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id)
  );

  CREATE INDEX IF NOT EXISTS idx_pilgrims_leader ON pilgrims(leader_id);
  CREATE INDEX IF NOT EXISTS idx_pilgrims_archived ON pilgrims(is_archived);
  CREATE INDEX IF NOT EXISTS idx_documents_pilgrim ON documents(pilgrim_id);
  CREATE INDEX IF NOT EXISTS idx_payments_pilgrim ON payments(pilgrim_id);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
`);

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Только изображения и PDF'));
  }
});

// Auth middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

// Audit log helper
function addAuditLog(action, objectType, objectId, objectName, userId, userName, oldValue, newValue) {
  db.prepare(`INSERT INTO audit_logs (id, action, object_type, object_id, object_name, user_id, user_name, old_value, new_value) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), action, objectType, objectId, objectName, userId, userName, oldValue || null, newValue || null
  );
}

// ====== AUTH ROUTES ======
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = jwt.sign({ id: user.id, role: user.role, leaderId: user.leader_id }, JWT_SECRET, { expiresIn: '24h' });
  addAuditLog('login', 'user', user.id, user.full_name, user.id, user.full_name);
  res.json({ token, user: { id: user.id, login: user.login, fullName: user.full_name, role: user.role, leaderId: user.leader_id } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, login, full_name, role, leader_id FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ id: user.id, login: user.login, fullName: user.full_name, role: user.role, leaderId: user.leader_id });
});

// ====== PILGRIMS ======
app.get('/api/pilgrims', authenticate, (req, res) => {
  let query = 'SELECT * FROM pilgrims WHERE is_archived = 0';
  const params = [];
  
  // Leader can only see their pilgrims
  if (req.user.role === 'leader') {
    query += ' AND leader_id = ?';
    params.push(req.user.leaderId);
  }
  
  // Filters
  if (req.query.leaderId) { query += ' AND leader_id = ?'; params.push(req.query.leaderId); }
  if (req.query.documentStatus) { query += ' AND document_status = ?'; params.push(req.query.documentStatus); }
  if (req.query.paymentStatus) { query += ' AND payment_status = ?'; params.push(req.query.paymentStatus); }
  if (req.query.uploadStatus) { query += ' AND upload_status = ?'; params.push(req.query.uploadStatus); }
  if (req.query.search) {
    query += ' AND (last_name LIKE ? OR first_name LIKE ? OR middle_name LIKE ? OR phone LIKE ? OR folder_number LIKE ?)';
    const s = `%${req.query.search}%`;
    params.push(s, s, s, s, s);
  }
  
  // Sort
  const sortBy = req.query.sortBy || 'created_at';
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortBy} ${sortOrder}`;
  
  const pilgrims = db.prepare(query).all(...params);
  res.json(pilgrims);
});

app.post('/api/pilgrims', authenticate, requireRole('admin', 'employee'), (req, res) => {
  const id = uuidv4();
  const { folderNumber, lastName, firstName, middleName, birthDate, passportExpiry, phone, totalAmount, leaderId, comments, additionalComments } = req.body;
  
  db.prepare(`INSERT INTO pilgrims (id, folder_number, last_name, first_name, middle_name, birth_date, passport_expiry, phone, total_amount, leader_id, comments, additional_comments)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, folderNumber, lastName, firstName, middleName, birthDate, passportExpiry, phone, totalAmount || 0, leaderId, comments, additionalComments
  );
  
  addAuditLog('pilgrim_created', 'pilgrim', id, `${lastName} ${firstName}`, req.user.id, req.user.fullName);
  
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(id);
  res.json(pilgrim);
});

app.get('/api/pilgrims/:id', authenticate, (req, res) => {
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  if (!pilgrim) return res.status(404).json({ error: 'Паломник не найден' });
  
  // Leader can only see their pilgrims
  if (req.user.role === 'leader' && pilgrim.leader_id !== req.user.leaderId) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  
  res.json(pilgrim);
});

app.patch('/api/pilgrims/:id', authenticate, requireRole('admin', 'employee'), (req, res) => {
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  if (!pilgrim) return res.status(404).json({ error: 'Паломник не найден' });
  
  // Version check for optimistic locking
  if (req.body.version && req.body.version !== pilgrim.version) {
    return res.status(409).json({ error: 'CONFLICT: Запись была изменена другим пользователем' });
  }
  
  const updates = [];
  const values = [];
  const allowed = ['folder_number', 'last_name', 'first_name', 'middle_name', 'birth_date', 'passport_expiry', 'phone', 'total_amount', 'leader_id', 'comments', 'additional_comments', 'upload_status'];
  
  for (const [key, value] of Object.entries(req.body)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(dbKey)) {
      updates.push(`${dbKey} = ?`);
      values.push(value);
    }
  }
  
  if (updates.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });
  
  updates.push('updated_at = datetime(\'now\')');
  updates.push('version = version + 1');
  values.push(req.params.id);
  
  db.prepare(`UPDATE pilgrims SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  // Update document status
  const docs = db.prepare('SELECT type FROM documents WHERE pilgrim_id = ?').all(req.params.id);
  const docTypes = ['photo', 'passport', 'registration', 'foreign_passport'];
  const hasAll = docTypes.every(t => docs.some(d => d.type === t));
  db.prepare('UPDATE pilgrims SET document_status = ? WHERE id = ?').run(hasAll ? 'complete' : 'incomplete', req.params.id);
  
  // Update payment status
  const payments = db.prepare('SELECT amount FROM payments WHERE pilgrim_id = ?').all(req.params.id);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const updatedPilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  let paymentStatus = 'not_paid';
  if (totalPaid === 0) paymentStatus = 'not_paid';
  else if (totalPaid < updatedPilgrim.total_amount) paymentStatus = 'partial';
  else if (totalPaid === updatedPilgrim.total_amount) paymentStatus = 'paid';
  else paymentStatus = 'overpaid';
  db.prepare('UPDATE pilgrims SET payment_status = ? WHERE id = ?').run(paymentStatus, req.params.id);
  
  addAuditLog('pilgrim_updated', 'pilgrim', req.params.id, `${updatedPilgrim.last_name} ${updatedPilgrim.first_name}`, req.user.id, req.user.fullName);
  
  res.json(db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id));
});

app.post('/api/pilgrims/:id/archive', authenticate, requireRole('admin', 'employee'), (req, res) => {
  db.prepare('UPDATE pilgrims SET is_archived = 1, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
  addAuditLog('pilgrim_archived', 'pilgrim', req.params.id, '', req.user.id, req.user.fullName);
  res.json({ success: true });
});

app.delete('/api/pilgrims/:id', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM pilgrims WHERE id = ?').run(req.params.id);
  addAuditLog('pilgrim_deleted', 'pilgrim', req.params.id, '', req.user.id, req.user.fullName);
  res.json({ success: true });
});

// Bulk operations
app.post('/api/pilgrims/bulk', authenticate, requireRole('admin', 'employee'), (req, res) => {
  const { ids, action, leaderId, uploadStatus } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Не указаны ID' });
  
  const stmt = db.prepare('UPDATE pilgrims SET updated_at = datetime(\'now\'), version = version + 1');
  
  if (action === 'change_leader' && leaderId) {
    db.prepare('UPDATE pilgrims SET leader_id = ?, updated_at = datetime(\'now\'), version = version + 1 WHERE id IN (?)').run(leaderId, ids.join(','));
  } else if (action === 'change_upload') {
    db.prepare('UPDATE pilgrims SET upload_status = ?, updated_at = datetime(\'now\'), version = version + 1 WHERE id IN (?)').run(uploadStatus || '', ids.join(','));
  } else if (action === 'archive') {
    db.prepare('UPDATE pilgrims SET is_archived = 1, updated_at = datetime(\'now\') WHERE id IN (?)').run(ids.join(','));
  } else if (action === 'delete') {
    db.prepare('DELETE FROM pilgrims WHERE id IN (?)').run(ids.join(','));
  }
  
  res.json({ success: true, count: ids.length });
});

// ====== DOCUMENTS ======
app.post('/api/pilgrims/:id/documents/:type', authenticate, requireRole('admin', 'employee'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  if (!pilgrim) return res.status(404).json({ error: 'Паломник не найден' });
  
  // Leader check
  if (req.user.role === 'leader' && pilgrim.leader_id !== req.user.leaderId) {
    fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Нет доступа' });
  }
  
  const id = uuidv4();
  const existing = db.prepare('SELECT * FROM documents WHERE pilgrim_id = ? AND type = ?').get(req.params.id, req.params.type);
  
  if (existing) {
    // Delete old file
    if (existing.storage_path) {
      const oldPath = path.join(__dirname, existing.storage_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    db.prepare('UPDATE documents SET file_name = ?, file_size = ?, mime_type = ?, storage_path = ?, uploaded_at = datetime(\'now\'), uploaded_by = ? WHERE id = ?')
      .run(req.file.originalname, req.file.size, req.file.mimetype, `uploads/${req.file.filename}`, req.user.id, existing.id);
    addAuditLog('document_replaced', 'document', existing.id, `${req.params.type}: ${req.file.originalname}`, req.user.id, req.user.fullName);
  } else {
    db.prepare('INSERT INTO documents (id, pilgrim_id, type, file_name, file_size, mime_type, storage_path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.params.id, req.params.type, req.file.originalname, req.file.size, req.file.mimetype, `uploads/${req.file.filename}`, req.user.id);
    addAuditLog('document_uploaded', 'document', id, `${req.params.type}: ${req.file.originalname}`, req.user.id, req.user.fullName);
  }
  
  // Update pilgrim document status
  const docs = db.prepare('SELECT type FROM documents WHERE pilgrim_id = ?').all(req.params.id);
  const docTypes = ['photo', 'passport', 'registration', 'foreign_passport'];
  const hasAll = docTypes.every(t => docs.some(d => d.type === t));
  db.prepare('UPDATE pilgrims SET document_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hasAll ? 'complete' : 'incomplete', req.params.id);
  
  res.json({ success: true });
});

app.get('/api/documents/:id', authenticate, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Документ не найден' });
  
  // Check access
  const pilgrim = db.prepare('SELECT leader_id FROM pilgrims WHERE id = ?').get(doc.pilgrim_id);
  if (req.user.role === 'leader' && pilgrim.leader_id !== req.user.leaderId) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  
  const filePath = path.join(__dirname, doc.storage_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });
  res.sendFile(filePath);
});

app.delete('/api/documents/:id', authenticate, requireRole('admin', 'employee'), (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Документ не найден' });
  
  if (doc.storage_path) {
    const filePath = path.join(__dirname, doc.storage_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  addAuditLog('document_deleted', 'document', req.params.id, `${doc.type}: ${doc.file_name}`, req.user.id, req.user.fullName);
  
  // Update pilgrim document status
  const docs = db.prepare('SELECT type FROM documents WHERE pilgrim_id = ?').all(doc.pilgrim_id);
  const docTypes = ['photo', 'passport', 'registration', 'foreign_passport'];
  const hasAll = docTypes.every(t => docs.some(d => d.type === t));
  db.prepare('UPDATE pilgrims SET document_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hasAll ? 'complete' : 'incomplete', doc.pilgrim_id);
  
  res.json({ success: true });
});

// ====== PAYMENTS ======
app.post('/api/pilgrims/:id/payments', authenticate, requireRole('admin', 'employee'), (req, res) => {
  const { amount, method } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Некорректная сумма' });
  
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  if (!pilgrim) return res.status(404).json({ error: 'Паломник не найден' });
  
  const paymentId = uuidv4();
  db.prepare('INSERT INTO payments (id, pilgrim_id, amount, paid_by, method) VALUES (?, ?, ?, ?, ?)')
    .run(paymentId, req.params.id, amount, req.user.id, method || 'cash');
  
  // Create receipt
  const receiptCount = db.prepare('SELECT COUNT(*) as count FROM receipts').get().count;
  const receiptNumber = `КВ-${String(receiptCount + 1).padStart(6, '0')}`;
  const receiptId = uuidv4();
  db.prepare('INSERT INTO receipts (id, number, pilgrim_id, payment_id, amount, pilgrim_name, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(receiptId, receiptNumber, req.params.id, paymentId, amount, `${pilgrim.last_name} ${pilgrim.first_name} ${pilgrim.middle_name}`, req.user.id);
  
  // Update payment status
  const payments = db.prepare('SELECT amount FROM payments WHERE pilgrim_id = ?').all(req.params.id);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  let paymentStatus = 'not_paid';
  if (totalPaid === 0) paymentStatus = 'not_paid';
  else if (totalPaid < pilgrim.total_amount) paymentStatus = 'partial';
  else if (totalPaid === pilgrim.total_amount) paymentStatus = 'paid';
  else paymentStatus = 'overpaid';
  db.prepare('UPDATE pilgrims SET payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(paymentStatus, req.params.id);
  
  addAuditLog('payment_added', 'payment', paymentId, `Оплата ${amount} руб.`, req.user.id, req.user.fullName);
  addAuditLog('receipt_created', 'receipt', receiptId, receiptNumber, req.user.id, req.user.fullName);
  
  res.json({ payment: { id: paymentId, amount }, receipt: { id: receiptId, number: receiptNumber } });
});

app.get('/api/pilgrims/:id/payments', authenticate, (req, res) => {
  const payments = db.prepare('SELECT * FROM payments WHERE pilgrim_id = ? ORDER BY paid_at DESC').all(req.params.id);
  res.json(payments);
});

app.get('/api/pilgrims/:id/receipts', authenticate, (req, res) => {
  const receipts = db.prepare('SELECT * FROM receipts WHERE pilgrim_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(receipts);
});

// ====== LEADERS ======
app.get('/api/leaders', authenticate, (req, res) => {
  const leaders = db.prepare('SELECT * FROM leaders ORDER BY full_name').all();
  res.json(leaders);
});

app.post('/api/leaders', authenticate, requireRole('admin'), (req, res) => {
  const { fullName, phone, telegramChatId } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO leaders (id, full_name, phone, telegram_chat_id) VALUES (?, ?, ?, ?)')
    .run(id, fullName, phone, telegramChatId);
  res.json(db.prepare('SELECT * FROM leaders WHERE id = ?').get(id));
});

app.patch('/api/leaders/:id', authenticate, requireRole('admin'), (req, res) => {
  const { fullName, phone, telegramChatId } = req.body;
  db.prepare('UPDATE leaders SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), telegram_chat_id = COALESCE(?, telegram_chat_id), updated_at = datetime(\'now\') WHERE id = ?')
    .run(fullName, phone, telegramChatId, req.params.id);
  res.json(db.prepare('SELECT * FROM leaders WHERE id = ?').get(req.params.id));
});

app.delete('/api/leaders/:id', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM leaders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ====== USERS ======
app.get('/api/users', authenticate, requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, login, full_name, role, leader_id, created_at FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticate, requireRole('admin'), (req, res) => {
  const { login, password, fullName, role, leaderId } = req.body;
  if (!login || !password || !fullName) return res.status(400).json({ error: 'Заполните все поля' });
  
  const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) return res.status(400).json({ error: 'Логин уже занят' });
  
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, login, password_hash, full_name, role, leader_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, login, hash, fullName, role, leaderId || null);
  
  addAuditLog('user_created', 'user', id, fullName, req.user.id, req.user.fullName);
  res.json({ id, login, fullName, role, leaderId });
});

app.delete('/api/users/:id', authenticate, requireRole('admin'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ====== AUDIT LOG ======
app.get('/api/audit-logs', authenticate, requireRole('admin'), (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(logs);
});

app.get('/api/pilgrims/:id/audit', authenticate, (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs WHERE object_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(logs);
});

// ====== TELEGRAM ======
app.get('/api/telegram', authenticate, requireRole('admin'), (req, res) => {
  const notifications = db.prepare('SELECT * FROM telegram_notifications ORDER BY sent_at DESC LIMIT 50').all();
  res.json(notifications);
});

// ====== SEED DATA ======
function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;
  
  // Create admin
  const adminId = uuidv4();
  db.prepare('INSERT INTO users (id, login, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)')
    .run(adminId, 'admin', bcrypt.hashSync('admin123', 10), 'Администратор Системы', 'admin');
  
  // Create employee
  const empId = uuidv4();
  db.prepare('INSERT INTO users (id, login, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)')
    .run(empId, 'employee', bcrypt.hashSync('emp123', 10), 'Иванова Мария Петровна', 'employee');
  
  // Create leaders
  const leaders = [
    { id: uuidv4(), fullName: 'Ахмедов Рустам Камилович', phone: '+7 (900) 111-22-33', telegram: '123456' },
    { id: uuidv4(), fullName: 'Сафина Гульнара Ринатовна', phone: '+7 (900) 444-55-66', telegram: '789012' },
    { id: uuidv4(), fullName: 'Хасанов Тимур Алиевич', phone: '+7 (900) 777-88-99', telegram: null }
  ];
  
  leaders.forEach(l => {
    db.prepare('INSERT INTO leaders (id, full_name, phone, telegram_chat_id) VALUES (?, ?, ?, ?)')
      .run(l.id, l.fullName, l.phone, l.telegram);
  });
  
  // Create leader users
  db.prepare('INSERT INTO users (id, login, password_hash, full_name, role, leader_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), 'ahmedov', bcrypt.hashSync('lead123', 10), leaders[0].fullName, 'leader', leaders[0].id);
  db.prepare('INSERT INTO users (id, login, password_hash, full_name, role, leader_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), 'safina', bcrypt.hashSync('lead123', 10), leaders[1].fullName, 'leader', leaders[1].id);
  
  // Create pilgrims
  const pilgrims = [
    { folder: 'П-001', last: 'Мухаметшин', first: 'Айдар', middle: 'Ринатович', birth: '1975-03-15', passport: '2030-06-20', phone: '+7 (917) 222-33-44', amount: 250000, leader: leaders[0].id },
    { folder: 'П-002', last: 'Гареева', first: 'Алия', middle: 'Фаридовна', birth: '1982-07-22', passport: '2028-11-10', phone: '+7 (917) 333-44-55', amount: 250000, leader: leaders[0].id },
    { folder: 'П-003', last: 'Нурлыев', first: 'Марат', middle: 'Ансарович', birth: '1968-01-08', passport: '2027-04-15', phone: '+7 (917) 444-55-66', amount: 300000, leader: leaders[1].id },
    { folder: 'П-004', last: 'Валиева', first: 'Зульфия', middle: 'Ильдусовна', birth: '1990-12-03', passport: '2031-09-25', phone: '+7 (917) 555-66-77', amount: 250000, leader: leaders[1].id },
    { folder: 'П-005', last: 'Сабиров', first: 'Ренат', middle: 'Альбертович', birth: '1971-05-19', passport: '2026-02-14', phone: '+7 (917) 666-77-88', amount: 280000, leader: leaders[2].id },
    { folder: 'П-006', last: 'Каримова', first: 'Лейсан', middle: 'Маратовна', birth: '1985-09-30', passport: '2029-07-01', phone: '+7 (917) 777-88-99', amount: 250000, leader: leaders[2].id },
  ];
  
  pilgrims.forEach(p => {
    db.prepare('INSERT INTO pilgrims (id, folder_number, last_name, first_name, middle_name, birth_date, passport_expiry, phone, total_amount, leader_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), p.folder, p.last, p.first, p.middle, p.birth, p.passport, p.phone, p.amount, p.leader);
  });
  
  console.log('✅ Демо-данные созданы');
}

seedData();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend сервер запущен на http://localhost:${PORT}`);
  console.log(`📁 Файлы загружаются в: ${uploadsDir}`);
  console.log(`\n📋 Демо-доступ:`);
  console.log(`   Админ: admin / admin123`);
  console.log(`   Сотрудник: employee / emp123`);
  console.log(`   Руководитель: ahmedov / lead123`);
});
