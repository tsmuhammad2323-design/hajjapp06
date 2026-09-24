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
