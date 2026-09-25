require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Database
const db = new Database('./crm.db');
db.pragma('journal_mode = WAL');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    leader_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leaders (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    telegram_chat_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    leader_id TEXT,
    program_type TEXT DEFAULT 'direct',
    tags TEXT DEFAULT '[]',
    has_photo INTEGER DEFAULT 0,
    has_passport INTEGER DEFAULT 0,
    has_registration INTEGER DEFAULT 0,
    has_foreign_passport INTEGER DEFAULT 0,
    comments TEXT,
    additional_comments TEXT,
    document_status TEXT DEFAULT 'incomplete',
    payment_status TEXT DEFAULT 'not_paid',
    upload_status TEXT DEFAULT '',
    is_archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (leader_id) REFERENCES leaders(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    pilgrim_id TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
    paid_by TEXT,
    method TEXT DEFAULT 'cash',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id)
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    pilgrim_id TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    amount REAL NOT NULL,
    pilgrim_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed data
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, login, password_hash, full_name, role, leader_id) VALUES (?, ?, ?, ?, ?, ?)');
  const insertLeader = db.prepare('INSERT INTO leaders (id, full_name, phone, telegram_chat_id) VALUES (?, ?, ?, ?)');
  const insertPilgrim = db.prepare('INSERT INTO pilgrims (id, folder_number, last_name, first_name, middle_name, birth_date, passport_expiry, phone, total_amount, leader_id, program_type, has_photo, has_passport, has_registration, has_foreign_passport) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  // Create admin
  const adminId = 'admin-' + Date.now();
  insertUser.run(adminId, 'admin', bcrypt.hashSync('admin123', 10), 'Администратор Системы', 'admin', null);

  // Create employee
  const empId = 'emp-' + Date.now();
  insertUser.run(empId, 'employee', bcrypt.hashSync('emp123', 10), 'Иванова Мария Петровна', 'employee', null);

  // Create leaders
  const leader1Id = 'leader1-' + Date.now();
  const leader2Id = 'leader2-' + Date.now();
  const leader3Id = 'leader3-' + Date.now();
  
  insertLeader.run(leader1Id, 'Ахмедов Рустам Камилович', '+7 (900) 111-22-33', '123456');
  insertLeader.run(leader2Id, 'Сафина Гульнара Ринатовна', '+7 (900) 444-55-66', '789012');
  insertLeader.run(leader3Id, 'Хасанов Тимур Алиевич', '+7 (900) 777-88-99', null);

  // Create leader users
  insertUser.run('ahmedov-' + Date.now(), 'ahmedov', bcrypt.hashSync('lead123', 10), 'Ахмедов Рустам Камилович', 'leader', leader1Id);
  insertUser.run('safina-' + Date.now(), 'safina', bcrypt.hashSync('lead123', 10), 'Сафина Гульнара Ринатовна', 'leader', leader2Id);

  // Create pilgrims
  const pilgrims = [
    { folder: 'А01', last: 'Мухаметшин', first: 'Айдар', middle: 'Ринатович', birth: '1975-03-15', passport: '2030-06-20', phone: '+7 (917) 222-33-44', amount: 250000, leader: leader1Id },
    { folder: 'А02', last: 'Гареева', first: 'Алия', middle: 'Фаридовна', birth: '1982-07-22', passport: '2028-11-10', phone: '+7 (917) 333-44-55', amount: 250000, leader: leader1Id },
    { folder: 'А03', last: 'Нурлыев', first: 'Марат', middle: 'Ансарович', birth: '1968-01-08', passport: '2027-04-15', phone: '+7 (917) 444-55-66', amount: 300000, leader: leader2Id },
    { folder: 'А04', last: 'Валиева', first: 'Зульфия', middle: 'Ильдусовна', birth: '1990-12-03', passport: '2031-09-25', phone: '+7 (917) 555-66-77', amount: 250000, leader: leader2Id },
    { folder: 'А05', last: 'Сабиров', first: 'Ренат', middle: 'Альбертович', birth: '1971-05-19', passport: '2026-02-14', phone: '+7 (917) 666-77-88', amount: 280000, leader: leader3Id },
    { folder: 'А06', last: 'Каримова', first: 'Лейсан', middle: 'Маратовна', birth: '1985-09-30', passport: '2029-07-01', phone: '+7 (917) 777-88-99', amount: 250000, leader: leader3Id },
    { folder: 'А07', last: 'Фаттахов', first: 'Ильдар', middle: 'Наилевич', birth: '1978-11-12', passport: '2032-01-30', phone: '+7 (917) 888-99-00', amount: 300000, leader: leader1Id },
    { folder: 'А08', last: 'Хакимова', first: 'Надия', middle: 'Рашидовна', birth: '1965-04-25', passport: '2025-08-18', phone: '+7 (917) 999-00-11', amount: 250000, leader: leader2Id },
  ];

  pilgrims.forEach(p => {
    const id = 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    insertPilgrim.run(
      id, p.folder, p.last, p.first, p.middle, p.birth, p.passport, p.phone, p.amount, p.leader, 'direct',
      Math.random() > 0.3 ? 1 : 0,
      Math.random() > 0.2 ? 1 : 0,
      Math.random() > 0.4 ? 1 : 0,
      Math.random() > 0.3 ? 1 : 0
    );
  });

  console.log('✅ Demo data created');
}

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

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  
  const token = jwt.sign(
    { id: user.id, role: user.role, leaderId: user.leader_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    token,
    user: {
      id: user.id,
      login: user.login,
      fullName: user.full_name,
      role: user.role,
      leaderId: user.leader_id
    }
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, login, full_name, role, leader_id FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  
  res.json({
    id: user.id,
    login: user.login,
    fullName: user.full_name,
    role: user.role,
    leaderId: user.leader_id
  });
});

// Pilgrims routes
app.get('/api/pilgrims', authenticate, (req, res) => {
  let query = 'SELECT * FROM pilgrims WHERE is_archived = 0';
  const params = [];
  
  if (req.user.role === 'leader') {
    query += ' AND leader_id = ?';
    params.push(req.user.leaderId);
  }
  
  const pilgrims = db.prepare(query).all(...params);
  res.json(pilgrims.map(p => ({
    ...p,
    tags: JSON.parse(p.tags || '[]'),
    hasPhoto: p.has_photo === 1,
    hasPassport: p.has_passport === 1,
    hasRegistration: p.has_registration === 1,
    hasForeignPassport: p.has_foreign_passport === 1,
    isArchived: p.is_archived === 1
  })));
});

app.get('/api/pilgrims/archived', authenticate, (req, res) => {
  let query = 'SELECT * FROM pilgrims WHERE is_archived = 1';
  const params = [];
  
  if (req.user.role === 'leader') {
    query += ' AND leader_id = ?';
    params.push(req.user.leaderId);
  }
  
  const pilgrims = db.prepare(query).all(...params);
  res.json(pilgrims.map(p => ({
    ...p,
    tags: JSON.parse(p.tags || '[]'),
    hasPhoto: p.has_photo === 1,
    hasPassport: p.has_passport === 1,
    hasRegistration: p.has_registration === 1,
    hasForeignPassport: p.has_foreign_passport === 1,
    isArchived: p.is_archived === 1
  })));
});

app.get('/api/pilgrims/:id', authenticate, (req, res) => {
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  if (!pilgrim) return res.status(404).json({ error: 'Паломник не найден' });
  
  if (req.user.role === 'leader' && pilgrim.leader_id !== req.user.leaderId) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  
  res.json({
    ...pilgrim,
    tags: JSON.parse(pilgrim.tags || '[]'),
    hasPhoto: pilgrim.has_photo === 1,
    hasPassport: pilgrim.has_passport === 1,
    hasRegistration: pilgrim.has_registration === 1,
    hasForeignPassport: pilgrim.has_foreign_passport === 1,
    isArchived: pilgrim.is_archived === 1
  });
});

app.post('/api/pilgrims', authenticate, (req, res) => {
  const id = 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const data = req.body;
  
  db.prepare(`
    INSERT INTO pilgrims (id, folder_number, last_name, first_name, middle_name, birth_date, passport_expiry, phone, total_amount, leader_id, program_type, tags, has_photo, has_passport, has_registration, has_foreign_passport, comments, additional_comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.folderNumber, data.lastName, data.firstName, data.middleName,
    data.birthDate, data.passportExpiry, data.phone, data.totalAmount,
    data.leaderId, data.programType || 'direct', JSON.stringify(data.tags || []),
    data.hasPhoto ? 1 : 0, data.hasPassport ? 1 : 0,
    data.hasRegistration ? 1 : 0, data.hasForeignPassport ? 1 : 0,
    data.comments, data.additionalComments
  );
  
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(id);
  res.json({
    ...pilgrim,
    tags: JSON.parse(pilgrim.tags || '[]'),
    hasPhoto: pilgrim.has_photo === 1,
    hasPassport: pilgrim.has_passport === 1,
    hasRegistration: pilgrim.has_registration === 1,
    hasForeignPassport: pilgrim.has_foreign_passport === 1,
    isArchived: pilgrim.is_archived === 1
  });
});

app.patch('/api/pilgrims/:id', authenticate, (req, res) => {
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  if (!pilgrim) return res.status(404).json({ error: 'Паломник не найден' });
  
  if (req.user.role === 'leader' && pilgrim.leader_id !== req.user.leaderId) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  
  const data = req.body;
  const updates = [];
  const values = [];
  
  if (data.folderNumber !== undefined) { updates.push('folder_number = ?'); values.push(data.folderNumber); }
  if (data.lastName !== undefined) { updates.push('last_name = ?'); values.push(data.lastName); }
  if (data.firstName !== undefined) { updates.push('first_name = ?'); values.push(data.firstName); }
  if (data.middleName !== undefined) { updates.push('middle_name = ?'); values.push(data.middleName); }
  if (data.birthDate !== undefined) { updates.push('birth_date = ?'); values.push(data.birthDate); }
  if (data.passportExpiry !== undefined) { updates.push('passport_expiry = ?'); values.push(data.passportExpiry); }
  if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
  if (data.totalAmount !== undefined) { updates.push('total_amount = ?'); values.push(data.totalAmount); }
  if (data.leaderId !== undefined) { updates.push('leader_id = ?'); values.push(data.leaderId); }
  if (data.programType !== undefined) { updates.push('program_type = ?'); values.push(data.programType); }
  if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
  if (data.hasPhoto !== undefined) { updates.push('has_photo = ?'); values.push(data.hasPhoto ? 1 : 0); }
  if (data.hasPassport !== undefined) { updates.push('has_passport = ?'); values.push(data.hasPassport ? 1 : 0); }
  if (data.hasRegistration !== undefined) { updates.push('has_registration = ?'); values.push(data.hasRegistration ? 1 : 0); }
  if (data.hasForeignPassport !== undefined) { updates.push('has_foreign_passport = ?'); values.push(data.hasForeignPassport ? 1 : 0); }
  if (data.comments !== undefined) { updates.push('comments = ?'); values.push(data.comments); }
  if (data.additionalComments !== undefined) { updates.push('additional_comments = ?'); values.push(data.additionalComments); }
  if (data.uploadStatus !== undefined) { updates.push('upload_status = ?'); values.push(data.uploadStatus); }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  updates.push('version = version + 1');
  values.push(req.params.id);
  
  if (updates.length > 2) {
    db.prepare(`UPDATE pilgrims SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  const updated = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  res.json({
    ...updated,
    tags: JSON.parse(updated.tags || '[]'),
    hasPhoto: updated.has_photo === 1,
    hasPassport: updated.has_passport === 1,
    hasRegistration: updated.has_registration === 1,
    hasForeignPassport: updated.has_foreign_passport === 1,
    isArchived: updated.is_archived === 1
  });
});

app.post('/api/pilgrims/:id/archive', authenticate, (req, res) => {
  db.prepare('UPDATE pilgrims SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/pilgrims/:id/restore', authenticate, (req, res) => {
  db.prepare('UPDATE pilgrims SET is_archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/pilgrims/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM pilgrims WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Leaders routes
app.get('/api/leaders', authenticate, (req, res) => {
  const leaders = db.prepare('SELECT * FROM leaders').all();
  res.json(leaders);
});

app.post('/api/leaders', authenticate, (req, res) => {
  const id = 'l-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const { fullName, phone, telegramChatId } = req.body;
  
  db.prepare('INSERT INTO leaders (id, full_name, phone, telegram_chat_id) VALUES (?, ?, ?, ?)').run(id, fullName, phone, telegramChatId);
  
  const leader = db.prepare('SELECT * FROM leaders WHERE id = ?').get(id);
  res.json(leader);
});

app.delete('/api/leaders/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM leaders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Users routes
app.get('/api/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только администратор' });
  
  const users = db.prepare('SELECT id, login, full_name, role, leader_id, created_at FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только администратор' });
  
  const id = 'u-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const { login, password, fullName, role, leaderId } = req.body;
  
  const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) return res.status(400).json({ error: 'Логин уже занят' });
  
  db.prepare('INSERT INTO users (id, login, password_hash, full_name, role, leader_id) VALUES (?, ?, ?, ?, ?, ?)').run(id, login, bcrypt.hashSync(password, 10), fullName, role, leaderId);
  
  res.json({ id, login, fullName, role, leaderId });
});

app.delete('/api/users/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только администратор' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
  
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Payments routes
app.get('/api/pilgrims/:id/payments', authenticate, (req, res) => {
  const payments = db.prepare('SELECT * FROM payments WHERE pilgrim_id = ? ORDER BY paid_at DESC').all(req.params.id);
  res.json(payments);
});

app.post('/api/pilgrims/:id/payments', authenticate, (req, res) => {
  const { amount, method } = req.body;
  const id = 'pay-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  db.prepare('INSERT INTO payments (id, pilgrim_id, amount, paid_by, method) VALUES (?, ?, ?, ?, ?)').run(id, req.params.id, amount, req.user.id, method || 'cash');
  
  // Create receipt
  const receiptCount = db.prepare('SELECT COUNT(*) as count FROM receipts').get();
  const receiptNumber = `КВ-${String(receiptCount.count + 1).padStart(6, '0')}`;
  const receiptId = 'r-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const pilgrim = db.prepare('SELECT * FROM pilgrims WHERE id = ?').get(req.params.id);
  
  db.prepare('INSERT INTO receipts (id, number, pilgrim_id, payment_id, amount, pilgrim_name, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    receiptId, receiptNumber, req.params.id, id, amount,
    `${pilgrim.last_name} ${pilgrim.first_name} ${pilgrim.middle_name}`,
    req.user.id
  );
  
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  res.json({ payment, receipt: { id: receiptId, number: receiptNumber } });
});

// Receipts routes
app.get('/api/pilgrims/:id/receipts', authenticate, (req, res) => {
  const receipts = db.prepare('SELECT * FROM receipts WHERE pilgrim_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(receipts);
});

// Audit logs
app.get('/api/audit-logs', authenticate, (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json(logs);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend сервер запущен на http://localhost:${PORT}`);
  console.log(`📋 Демо-доступ:`);
  console.log(`   Админ: admin / admin123`);
  console.log(`   Сотрудник: employee / emp123`);
  console.log(`   Руководитель: ahmedov / lead123`);
});
