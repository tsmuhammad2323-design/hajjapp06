import { v4 as uuidv4 } from 'uuid';
import type {
  User, Leader, Pilgrim, Payment, Receipt,
  AuditLogEntry, TelegramNotification, TableSettings, Session,
  UserRole, DocumentStatus, PaymentStatus, UploadStatus, AuditAction,
  SystemSettings, Currency, Tag
} from '../types';
import { DEFAULT_SETTINGS, CURRENCIES } from '../types';

const DB_PREFIX = 'crm_';

function getKey(key: string) { return DB_PREFIX + key; }
function get<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(getKey(key)) || '[]'); }
  catch { return []; }
}
function set<T>(key: string, data: T[]) {
  localStorage.setItem(getKey(key), JSON.stringify(data));
}
function getOne<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(getKey(key)) || 'null'); }
  catch { return null; }
}
function setOne<T>(key: string, data: T) {
  localStorage.setItem(getKey(key), JSON.stringify(data));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

// ====== SESSION ======
export function getSession(): Session | null {
  return getOne<Session>('session');
}

export function setSession(session: Session | null) {
  if (session) setOne('session', session);
  else localStorage.removeItem(getKey('session'));
}

// ====== AUTH ======
export function login(loginStr: string, password: string): { success: boolean; user?: User; error?: string } {
  const users = get<User>('users');
  const hash = simpleHash(password);
  const user = users.find(u => u.login === loginStr && u.passwordHash === hash);
  if (!user) return { success: false, error: 'Неверный логин или пароль' };
  const session: Session = { userId: user.id, role: user.role, leaderId: user.leaderId, loginAt: new Date().toISOString() };
  setSession(session);
  addAuditLog('login', 'user', user.id, user.fullName, user.id, user.fullName);
  return { success: true, user };
}

export function logout() {
  const session = getSession();
  if (session) addAuditLog('logout', 'user', session.userId, '', session.userId);
  setSession(null);
}

// ====== USERS ======
export function getUsers(): User[] { return get<User>('users'); }
export function getUser(id: string): User | undefined { return get<User>('users').find(u => u.id === id); }

export function createUser(data: { login: string; password: string; fullName: string; role: UserRole; leaderId?: string }): User {
  const users = get<User>('users');
  if (users.find(u => u.login === data.login)) throw new Error('Логин уже занят');
  const user: User = {
    id: uuidv4(), login: data.login, passwordHash: simpleHash(data.password),
    fullName: data.fullName, role: data.role, leaderId: data.leaderId,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  users.push(user);
  set('users', users);
  return user;
}

export function deleteUser(id: string) {
  set('users', get<User>('users').filter(u => u.id !== id));
}

// ====== LEADERS ======
export function getLeaders(): Leader[] { return get<Leader>('leaders'); }
export function getLeader(id: string): Leader | undefined { return get<Leader>('leaders').find(l => l.id === id); }

export function createLeader(data: { fullName: string; phone: string; telegramChatId?: string }): Leader {
  const leaders = get<Leader>('leaders');
  const leader: Leader = {
    id: uuidv4(), fullName: data.fullName, phone: data.phone,
    telegramChatId: data.telegramChatId,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  leaders.push(leader);
  set('leaders', leaders);
  return leader;
}

export function updateLeader(id: string, data: Partial<Leader>): Leader {
  const leaders = get<Leader>('leaders');
  const idx = leaders.findIndex(l => l.id === id);
  if (idx === -1) throw new Error('Руководитель не найден');
  leaders[idx] = { ...leaders[idx], ...data, updatedAt: new Date().toISOString() };
  set('leaders', leaders);
  return leaders[idx];
}

export function deleteLeader(id: string) {
  set('leaders', get<Leader>('leaders').filter(l => l.id !== id));
}

// ====== PILGRIMS ======
export function getPilgrims(): Pilgrim[] { return get<Pilgrim>('pilgrims'); }
export function getPilgrim(id: string): Pilgrim | undefined { return get<Pilgrim>('pilgrims').find(p => p.id === id); }

export function getPilgrimsForUser(): Pilgrim[] {
  const session = getSession();
  if (!session) return [];
  const all = get<Pilgrim>('pilgrims');
  if (session.role === 'admin' || session.role === 'employee') return all.filter(p => !p.isArchived);
  if (session.role === 'leader') return all.filter(p => p.leaderId === session.leaderId && !p.isArchived);
  return [];
}

export function getArchivedPilgrims(): Pilgrim[] {
  const session = getSession();
  if (!session) return [];
  const all = get<Pilgrim>('pilgrims');
  if (session.role === 'admin' || session.role === 'employee') return all.filter(p => p.isArchived);
  if (session.role === 'leader') return all.filter(p => p.leaderId === session.leaderId && p.isArchived);
  return [];
}

export function createPilgrim(data: Partial<Pilgrim>): Pilgrim {
  const pilgrims = get<Pilgrim>('pilgrims');
  const session = getSession();
  const settings = getSystemSettings();
  const programType = data.programType || settings.defaultProgram;
  const programPrice = programType === 'direct' ? settings.programDirect.price : settings.programEconomy.price;
  
  let folderNumber = data.folderNumber || '';
  if (!folderNumber) {
    folderNumber = generateNextFolderNumber();
  }
  
  const pilgrim: Pilgrim = {
    id: uuidv4(), folderNumber, lastName: data.lastName || '',
    firstName: data.firstName || '', middleName: data.middleName || '',
    birthDate: data.birthDate || '', passportExpiry: data.passportExpiry || '',
    phone: data.phone || '', totalAmount: data.totalAmount || programPrice,
    leaderId: data.leaderId || '', programType,
    tags: data.tags || [],
    hasPhoto: data.hasPhoto || false,
    hasPassport: data.hasPassport || false,
    hasRegistration: data.hasRegistration || false,
    hasForeignPassport: data.hasForeignPassport || false,
    comments: data.comments || '',
    additionalComments: data.additionalComments || '',
    documentStatus: 'incomplete', paymentStatus: 'not_paid', uploadStatus: '',
    isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1
  };
  pilgrims.push(pilgrim);
  set('pilgrims', pilgrims);
  addAuditLog('pilgrim_created', 'pilgrim', pilgrim.id, `${pilgrim.lastName} ${pilgrim.firstName}`, session?.userId);
  return pilgrim;
}

export function updatePilgrim(id: string, data: Partial<Pilgrim>, checkVersion = true): Pilgrim {
  const pilgrims = get<Pilgrim>('pilgrims');
  const idx = pilgrims.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Паломник не найден');
  const old = pilgrims[idx];
  if (checkVersion && data.version && data.version !== old.version) {
    throw new Error('CONFLICT: Запись была изменена другим пользователем');
  }
  
  pilgrims[idx] = { ...old, ...data, updatedAt: new Date().toISOString(), version: old.version + 1 };
  
  // Auto-compute document status based on checkboxes
  const hasAll = pilgrims[idx].hasPhoto && 
                 pilgrims[idx].hasPassport && 
                 pilgrims[idx].hasRegistration && 
                 pilgrims[idx].hasForeignPassport;
  pilgrims[idx].documentStatus = hasAll ? 'complete' : 'incomplete';
  
  // Auto-compute payment status
  const payments = getPayments(id);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  if (totalPaid === 0) pilgrims[idx].paymentStatus = 'not_paid';
  else if (totalPaid < pilgrims[idx].totalAmount) pilgrims[idx].paymentStatus = 'partial';
  else if (totalPaid === pilgrims[idx].totalAmount) pilgrims[idx].paymentStatus = 'paid';
  else pilgrims[idx].paymentStatus = 'overpaid';
  
  set('pilgrims', pilgrims);
  return pilgrims[idx];
}

export function archivePilgrim(id: string) {
  const pilgrims = get<Pilgrim>('pilgrims');
  const idx = pilgrims.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Паломник не найден');
  pilgrims[idx].isArchived = true;
  pilgrims[idx].updatedAt = new Date().toISOString();
  set('pilgrims', pilgrims);
}

export function restorePilgrim(id: string) {
  const pilgrims = get<Pilgrim>('pilgrims');
  const idx = pilgrims.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Паломник не найден');
  pilgrims[idx].isArchived = false;
  pilgrims[idx].updatedAt = new Date().toISOString();
  set('pilgrims', pilgrims);
}

export function deletePilgrim(id: string) {
  set('pilgrims', get<Pilgrim>('pilgrims').filter(p => p.id !== id));
}

// ====== PAYMENTS ======
export function getPayments(pilgrimId?: string): Payment[] {
  const payments = get<Payment>('payments');
  if (pilgrimId) return payments.filter(p => p.pilgrimId === pilgrimId);
  return payments;
}

export function addPayment(pilgrimId: string, amount: number, method: string = 'наличные'): Payment {
  const session = getSession();
  const payment: Payment = {
    id: uuidv4(), pilgrimId, amount, paidAt: new Date().toISOString(),
    paidBy: session?.userId || '', method, createdAt: new Date().toISOString()
  };
  const payments = get<Payment>('payments');
  payments.push(payment);
  set('payments', payments);
  
  const receipt = createReceipt(pilgrimId, payment);
  updatePilgrim(pilgrimId, {}, false);
  
  return payment;
}

// ====== RECEIPTS ======
export function getReceipts(pilgrimId?: string): Receipt[] {
  const receipts = get<Receipt>('receipts');
  if (pilgrimId) return receipts.filter(r => r.pilgrimId === pilgrimId);
  return receipts;
}

function createReceipt(pilgrimId: string, payment: Payment): Receipt {
  const pilgrim = getPilgrim(pilgrimId);
  const session = getSession();
  const allReceipts = get<Receipt>('receipts');
  const number = `КВ-${String(allReceipts.length + 1).padStart(6, '0')}`;
  const receipt: Receipt = {
    id: uuidv4(), number, pilgrimId, paymentId: payment.id,
    amount: payment.amount, pilgrimName: pilgrim ? `${pilgrim.lastName} ${pilgrim.firstName} ${pilgrim.middleName}` : '',
    createdAt: new Date().toISOString(), createdBy: session?.userId || ''
  };
  allReceipts.push(receipt);
  set('receipts', allReceipts);
  return receipt;
}

// ====== AUDIT LOG ======
export function getAuditLogs(objectId?: string, objectType?: string): AuditLogEntry[] {
  let logs = get<AuditLogEntry>('audit_logs');
  if (objectId) logs = logs.filter(l => l.objectId === objectId);
  if (objectType) logs = logs.filter(l => l.objectType === objectType);
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function addAuditLog(action: AuditAction, objectType: string, objectId: string, objectName?: string, userId?: string, oldValue?: string, newValue?: string) {
  const session = getSession();
  const uid = userId || session?.userId || 'system';
  const user = getUser(uid);
  const entry: AuditLogEntry = {
    id: uuidv4(), action, objectType, objectId, objectName,
    userId: uid, userName: user?.fullName || 'Система',
    oldValue, newValue, createdAt: new Date().toISOString()
  };
  const logs = get<AuditLogEntry>('audit_logs');
  logs.push(entry);
  set('audit_logs', logs);
}

// ====== TELEGRAM (SIMULATED) ======
export function getTelegramNotifications(): TelegramNotification[] {
  return get<TelegramNotification>('telegram_notifications');
}

// ====== TABLE SETTINGS ======
export function getTableSettings(): TableSettings {
  const saved = getOne<TableSettings>('table_settings');
  const defaults: TableSettings = {
    visibleColumns: ['folderNumber', 'fullName', 'phone', 'leaderId', 'documentStatus', 'paymentStatus', 'uploadStatus'],
    columnWidths: {}, pinnedColumns: ['fullName'],
    sortBy: 'createdAt', sortOrder: 'desc'
  };
  if (!saved) return defaults;
  return saved;
}

export function setTableSettings(settings: TableSettings) {
  setOne('table_settings', settings);
}

// ====== SYSTEM SETTINGS ======
export function getSystemSettings(): SystemSettings {
  const saved = getOne<SystemSettings>('system_settings');
  if (!saved) return DEFAULT_SETTINGS;
  
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    programDirect: saved.programDirect || DEFAULT_SETTINGS.programDirect,
    programEconomy: saved.programEconomy || DEFAULT_SETTINGS.programEconomy,
    defaultProgram: saved.defaultProgram || DEFAULT_SETTINGS.defaultProgram,
    receiptTemplateConfig: saved.receiptTemplateConfig || DEFAULT_SETTINGS.receiptTemplateConfig,
    availableTags: saved.availableTags || DEFAULT_SETTINGS.availableTags,
    maxFolderNumber: saved.maxFolderNumber || DEFAULT_SETTINGS.maxFolderNumber,
    backendEnabled: saved.backendEnabled || DEFAULT_SETTINGS.backendEnabled,
    backendUrl: saved.backendUrl || DEFAULT_SETTINGS.backendUrl,
    lastSyncAt: saved.lastSyncAt
  };
}

export function updateSystemSettings(settings: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  const updated = { ...current, ...settings };
  setOne('system_settings', updated);
  return updated;
}

// ====== TAGS ======
export function getAvailableTags(): Tag[] {
  return getSystemSettings().availableTags || [];
}

export function createTag(name: string, color: string): Tag {
  const settings = getSystemSettings();
  const newTag: Tag = { id: uuidv4(), name, color };
  const updatedTags = [...(settings.availableTags || []), newTag];
  updateSystemSettings({ availableTags: updatedTags });
  return newTag;
}

export function updateTag(id: string, updates: Partial<Tag>): Tag {
  const settings = getSystemSettings();
  const tags = settings.availableTags || [];
  const idx = tags.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Тег не найден');
  tags[idx] = { ...tags[idx], ...updates };
  updateSystemSettings({ availableTags: tags });
  return tags[idx];
}

export function deleteTag(id: string): void {
  const settings = getSystemSettings();
  const tags = (settings.availableTags || []).filter(t => t.id !== id);
  updateSystemSettings({ availableTags: tags });
}

export function getTagById(id: string): Tag | undefined {
  return getAvailableTags().find(t => t.id === id);
}

// ====== UTILS ======
export function formatCurrency(amount: number): string {
  const settings = getSystemSettings();
  const currency = CURRENCIES[settings.currency];
  const formatted = amount.toLocaleString('ru-RU');
  return currency.position === 'before' 
    ? `${currency.symbol} ${formatted}` 
    : `${formatted} ${currency.symbol}`;
}

export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getPassportExpiryStatus(expiryDate: string): { status: 'valid' | 'warning' | 'expired' | 'empty'; daysLeft: number; referenceDate: Date } {
  if (!expiryDate) return { status: 'empty', daysLeft: 0, referenceDate: new Date() };
  const settings = getSystemSettings();
  const referenceDate = settings.hajjDate ? new Date(settings.hajjDate) : new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - referenceDate.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const MIN_PASSPORT_VALIDITY_DAYS = 180;
  
  if (daysLeft < 0) return { status: 'expired', daysLeft, referenceDate };
  if (daysLeft < MIN_PASSPORT_VALIDITY_DAYS) return { status: 'warning', daysLeft, referenceDate };
  return { status: 'valid', daysLeft, referenceDate };
}

export function generateNextFolderNumber(): string {
  const settings = getSystemSettings();
  const maxNum = settings.maxFolderNumber || 1500;
  const pilgrims = get<Pilgrim>('pilgrims');
  
  let maxUsed = 0;
  pilgrims.forEach(p => {
    const match = p.folderNumber.match(/^А(\d+)$/i);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxUsed) maxUsed = num;
    }
  });
  
  const nextNum = maxUsed + 1;
  if (nextNum > maxNum) {
    throw new Error(`Достигнут лимит номеров папок (А${maxNum})`);
  }
  
  return `А${String(nextNum).padStart(2, '0')}`;
}

// ====== THEME ======
export function getTheme(): 'light' | 'dark' {
  const theme = localStorage.getItem('crm_theme');
  return (theme as 'light' | 'dark') || 'light';
}

export function setTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem('crm_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(): 'light' | 'dark' {
  const current = getTheme();
  const newTheme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

// ====== BACKUP ======
export function exportBackup(): string {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    users: get<User>('users'),
    leaders: get<Leader>('leaders'),
    pilgrims: get<Pilgrim>('pilgrims'),
    payments: get<Payment>('payments'),
    receipts: get<Receipt>('receipts'),
    auditLogs: get<AuditLogEntry>('audit_logs'),
    telegramNotifications: get<TelegramNotification>('telegram_notifications'),
    settings: getSystemSettings(),
    tableSettings: getTableSettings()
  };
  return JSON.stringify(data, null, 2);
}

export function importBackup(json: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json);
    if (!data.version || !data.pilgrims) {
      return { success: false, error: 'Неверный формат файла резервной копии' };
    }
    if (data.users) set('users', data.users);
    if (data.leaders) set('leaders', data.leaders);
    if (data.pilgrims) set('pilgrims', data.pilgrims);
    if (data.payments) set('payments', data.payments);
    if (data.receipts) set('receipts', data.receipts);
    if (data.auditLogs) set('audit_logs', data.auditLogs);
    if (data.telegramNotifications) set('telegram_notifications', data.telegramNotifications);
    if (data.settings) setOne('system_settings', data.settings);
    if (data.tableSettings) setOne('table_settings', data.tableSettings);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Ошибка импорта' };
  }
}

// ====== SEED DATA ======
export function seedDatabase() {
  if (getOne('seeded')) return;
  
  if (!getOne('system_settings')) {
    setOne('system_settings', DEFAULT_SETTINGS);
  }
  
  createUser({ login: 'admin', password: 'admin123', fullName: 'Администратор Системы', role: 'admin' });
  createUser({ login: 'employee', password: 'emp123', fullName: 'Иванова Мария Петровна', role: 'employee' });
  
  const leader1 = createLeader({ fullName: 'Ахмедов Рустам Камилович', phone: '+7 (900) 111-22-33', telegramChatId: '123456' });
  const leader2 = createLeader({ fullName: 'Сафина Гульнара Ринатовна', phone: '+7 (900) 444-55-66', telegramChatId: '789012' });
  const leader3 = createLeader({ fullName: 'Хасанов Тимур Алиевич', phone: '+7 (900) 777-88-99' });
  
  createUser({ login: 'ahmedov', password: 'lead123', fullName: 'Ахмедов Рустам Камилович', role: 'leader', leaderId: leader1.id });
  createUser({ login: 'safina', password: 'lead123', fullName: 'Сафина Гульнара Ринатовна', role: 'leader', leaderId: leader2.id });
  
  const pilgrimData = [
    { folderNumber: 'А01', lastName: 'Мухаметшин', firstName: 'Айдар', middleName: 'Ринатович', birthDate: '1975-03-15', passportExpiry: '2030-06-20', phone: '+7 (917) 222-33-44', totalAmount: 250000, leaderId: leader1.id, comments: 'Первый раз' },
    { folderNumber: 'А02', lastName: 'Гареева', firstName: 'Алия', middleName: 'Фаридовна', birthDate: '1982-07-22', passportExpiry: '2028-11-10', phone: '+7 (917) 333-44-55', totalAmount: 250000, leaderId: leader1.id, comments: '' },
    { folderNumber: 'А03', lastName: 'Нурлыев', firstName: 'Марат', middleName: 'Ансарович', birthDate: '1968-01-08', passportExpiry: '2027-04-15', phone: '+7 (917) 444-55-66', totalAmount: 300000, leaderId: leader2.id, comments: 'Нужен перевод документов' },
    { folderNumber: 'А04', lastName: 'Валиева', firstName: 'Зульфия', middleName: 'Ильдусовна', birthDate: '1990-12-03', passportExpiry: '2031-09-25', phone: '+7 (917) 555-66-77', totalAmount: 250000, leaderId: leader2.id, comments: '' },
    { folderNumber: 'А05', lastName: 'Сабиров', firstName: 'Ренат', middleName: 'Альбертович', birthDate: '1971-05-19', passportExpiry: '2026-02-14', phone: '+7 (917) 666-77-88', totalAmount: 280000, leaderId: leader3.id, comments: 'Срочно - паспорт истекает' },
    { folderNumber: 'А06', lastName: 'Каримова', firstName: 'Лейсан', middleName: 'Маратовна', birthDate: '1985-09-30', passportExpiry: '2029-07-01', phone: '+7 (917) 777-88-99', totalAmount: 250000, leaderId: leader3.id, comments: '' },
    { folderNumber: 'А07', lastName: 'Фаттахов', firstName: 'Ильдар', middleName: 'Наилевич', birthDate: '1978-11-12', passportExpiry: '2032-01-30', phone: '+7 (917) 888-99-00', totalAmount: 300000, leaderId: leader1.id, comments: 'Группа с женой' },
    { folderNumber: 'А08', lastName: 'Хакимова', firstName: 'Надия', middleName: 'Рашидовна', birthDate: '1965-04-25', passportExpiry: '2025-08-18', phone: '+7 (917) 999-00-11', totalAmount: 250000, leaderId: leader2.id, comments: 'Паспорт нужно менять' },
  ];
  
  pilgrimData.forEach(data => {
    const pilgrimWithDocs = {
      ...data,
      hasPhoto: Math.random() > 0.3,
      hasPassport: Math.random() > 0.2,
      hasRegistration: Math.random() > 0.4,
      hasForeignPassport: Math.random() > 0.3
    };
    const p = createPilgrim(pilgrimWithDocs);
    if (Math.random() > 0.3) {
      const payAmount = Math.floor(data.totalAmount * (0.3 + Math.random() * 0.7));
      addPayment(p.id, payAmount);
    }
  });
  
  setOne('seeded', true);
}

// Инициализация темы
if (typeof window !== 'undefined') {
  const theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
}
