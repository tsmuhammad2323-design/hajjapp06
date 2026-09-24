// ====== ROLES & USERS ======
export type UserRole = 'admin' | 'employee' | 'leader';

export interface User {
  id: string;
  login: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  leaderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ====== LEADER ======
export interface Leader {
  id: string;
  fullName: string;
  phone: string;
  telegramChatId?: string;
  createdAt: string;
  updatedAt: string;
}

// ====== DOCUMENT TYPES ======
export type DocumentType = 'photo' | 'passport' | 'registration' | 'foreign_passport';

export interface DocumentFile {
  id: string;
  pilgrimId: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  dataUrl?: string;
}

export type DocumentStatus = 'complete' | 'incomplete';

// ====== UPLOAD STATUS ======
export type UploadStatus = '' | 'reserve' | 'main';

// ====== PAYMENT STATUS ======
export type PaymentStatus = 'not_paid' | 'partial' | 'paid' | 'overpaid';

// ====== PILGRIM ======
export interface Pilgrim {
  id: string;
  folderNumber: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  passportExpiry: string;
  phone: string;
  totalAmount: number;
  leaderId: string;
  programType?: ProgramType; // Опционально для обратной совместимости
  comments: string;
  additionalComments: string;
  documentStatus: DocumentStatus;
  paymentStatus: PaymentStatus;
  uploadStatus: UploadStatus;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ====== PAYMENT ======
export interface Payment {
  id: string;
  pilgrimId: string;
  amount: number;
  paidAt: string;
  paidBy: string;
  method: string;
  createdAt: string;
}

// ====== RECEIPT ======
export interface Receipt {
  id: string;
  number: string;
  pilgrimId: string;
  paymentId: string;
  amount: number;
  pilgrimName: string;
  createdAt: string;
  createdBy: string;
}

// ====== AUDIT LOG ======
export type AuditAction = 
  | 'pilgrim_created'
  | 'pilgrim_updated'
  | 'pilgrim_deleted'
  | 'pilgrim_archived'
  | 'leader_changed'
  | 'document_uploaded'
  | 'document_replaced'
  | 'document_deleted'
  | 'payment_added'
  | 'payment_changed'
  | 'status_changed'
  | 'receipt_created'
  | 'telegram_sent'
  | 'telegram_error'
  | 'user_created'
  | 'user_updated'
  | 'login'
  | 'logout';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  objectType: string;
  objectId: string;
  objectName?: string;
  userId: string;
  userName: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ====== TELEGRAM NOTIFICATION ======
export interface TelegramNotification {
  id: string;
  leaderId: string;
  pilgrimId: string;
  message: string;
  status: 'sent' | 'error' | 'pending';
  errorMessage?: string;
  sentAt: string;
}

// ====== TABLE SETTINGS ======
export interface TableSettings {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  pinnedColumns: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ====== CURRENCY ======
export type Currency = 'RUB' | 'USD' | 'EUR' | 'KZT' | 'UZS' | 'TRY' | 'AED';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  position: 'before' | 'after';
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  RUB: { code: 'RUB', symbol: '₽', name: 'Российский рубль', position: 'after' },
  USD: { code: 'USD', symbol: '$', name: 'Доллар США', position: 'before' },
  EUR: { code: 'EUR', symbol: '€', name: 'Евро', position: 'after' },
  KZT: { code: 'KZT', symbol: '₸', name: 'Казахский тенге', position: 'after' },
  UZS: { code: 'UZS', symbol: 'сўм', name: 'Узбекский сум', position: 'after' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Турецкая лира', position: 'after' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'Дирхам ОАЭ', position: 'after' },
};

// ====== PROGRAM TYPE ======
export type ProgramType = 'direct' | 'economy';

export interface ProgramConfig {
  type: ProgramType;
  name: string;
  price: number;
  description: string;
}

export const PROGRAMS: Record<ProgramType, ProgramConfig> = {
  direct: { 
    type: 'direct', 
    name: 'Прямой рейс', 
    price: 350000, 
    description: 'Прямой перелёт без пересадок, комфортные условия' 
  },
  economy: { 
    type: 'economy', 
    name: 'Эконом', 
    price: 250000, 
    description: 'Экономичный вариант с пересадками' 
  },
};

// ====== RECEIPT TEMPLATE ======
export interface ReceiptTemplate {
  id: string;
  name: string;
  title: string;
  headerLeft: string;
  headerRight: string;
  fields: ReceiptField[];
  footerText: string;
  showStamp: boolean;
  showSignature: boolean;
  copies: number; // Количество копий на листе (1 или 2)
}

export interface ReceiptField {
  id: string;
  label: string;
  value: string; // Может содержать переменные: {{pilgrimName}}, {{amount}}, {{amountWords}} и т.д.
  isAmount?: boolean;
  isLarge?: boolean;
}

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  id: 'default',
  name: 'Стандартный шаблон',
  title: 'КВИТАНЦИЯ ОБ ОПЛАТЕ ХАДЖА',
  headerLeft: '',
  headerRight: '№ {{number}}\nДата: «{{day}}» {{month}} {{year}} г.',
  fields: [
    {
      id: 'payer',
      label: 'Принято от (ФИО плательщика):',
      value: '{{pilgrimName}}',
      isAmount: false,
      isLarge: false
    },
    {
      id: 'purpose',
      label: 'За оплату Хаджа за (ФИО паломника):',
      value: '{{pilgrimName}}',
      isAmount: false,
      isLarge: false
    },
    {
      id: 'amountWords',
      label: 'Сумма прописью:',
      value: '{{amountWords}}',
      isAmount: false,
      isLarge: false
    },
    {
      id: 'amount',
      label: 'Сумма цифрами:',
      value: '{{amount}} руб.',
      isAmount: true,
      isLarge: false
    },
    {
      id: 'description',
      label: 'Назначение платежа:',
      value: 'Оплата услуг по организации паломничества (Хадж)',
      isAmount: false,
      isLarge: false
    }
  ],
  footerText: 'Исполнитель (принял средства):',
  showStamp: true,
  showSignature: true,
  copies: 2
};

// ====== SETTINGS ======
export interface SystemSettings {
  currency: Currency;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyInn: string;
  telegramBotToken: string;
  passportExpiryWarningDays: number;
  receiptTemplate: string;
  language: 'ru' | 'en';
  dateFormat: string;
  hajjDate: string; // Дата хаджа для проверки загранпаспорта
  programDirect: ProgramConfig;
  programEconomy: ProgramConfig;
  defaultProgram: ProgramType;
  receiptTemplateConfig: ReceiptTemplate;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  currency: 'RUB',
  companyName: 'Организация паломничества',
  companyAddress: '',
  companyPhone: '',
  companyInn: '',
  telegramBotToken: '',
  passportExpiryWarningDays: 180,
  receiptTemplate: 'default',
  language: 'ru',
  dateFormat: 'dd.MM.yyyy',
  hajjDate: '2026-06-05',
  programDirect: { ...PROGRAMS.direct },
  programEconomy: { ...PROGRAMS.economy },
  defaultProgram: 'direct',
  receiptTemplateConfig: { ...DEFAULT_RECEIPT_TEMPLATE },
};

// ====== SESSION ======
export interface Session {
  userId: string;
  role: UserRole;
  leaderId?: string;
  loginAt: string;
}

// ====== API RESPONSE ======
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
