// API клиент для работы с backend
// Если backend доступен — используется API, иначе — localStorage

const API_URL = import.meta.env.VITE_API_URL || '/api';

let useBackend = false;
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('crm_token', token);
  } else {
    localStorage.removeItem('crm_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('crm_token');
  }
  return authToken;
}

export function setUseBackend(value: boolean) {
  useBackend = value;
}

export function isUsingBackend(): boolean {
  return useBackend;
}

async function request<T>(method: string, url: string, data?: any): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (response.status === 401) {
    setAuthToken(null);
    throw new Error('Сессия истекла. Войдите снова.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(error.error || `Ошибка ${response.status}`);
  }

  return response.json();
}

// ====== AUTH ======
export async function apiLogin(login: string, password: string) {
  const result = await request<{ token: string; user: any }>('POST', '/auth/login', { login, password });
  setAuthToken(result.token);
  setUseBackend(true);
  return result;
}

export async function apiGetMe() {
  return request<any>('GET', '/auth/me');
}

// ====== PILGRIMS ======
export async function apiGetPilgrims(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters || {}).toString();
  return request<any[]>('GET', `/pilgrims${params ? '?' + params : ''}`);
}

export async function apiGetPilgrim(id: string) {
  return request<any>('GET', `/pilgrims/${id}`);
}

export async function apiCreatePilgrim(data: any) {
  return request<any>('POST', '/pilgrims', data);
}

export async function apiUpdatePilgrim(id: string, data: any) {
  return request<any>('PATCH', `/pilgrims/${id}`, data);
}

export async function apiArchivePilgrim(id: string) {
  return request<any>('POST', `/pilgrims/${id}/archive`);
}

export async function apiDeletePilgrim(id: string) {
  return request<any>('DELETE', `/pilgrims/${id}`);
}

export async function apiBulkAction(ids: string[], action: string, extra?: any) {
  return request<any>('POST', '/pilgrims/bulk', { ids, action, ...extra });
}

// ====== DOCUMENTS ======
export async function apiUploadDocument(pilgrimId: string, type: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const token = getAuthToken();
  
  const response = await fetch(`${API_URL}/pilgrims/${pilgrimId}/documents/${type}`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });
  
  if (!response.ok) throw new Error('Ошибка загрузки файла');
  return response.json();
}

export async function apiGetDocuments(pilgrimId: string) {
  // Documents are included in pilgrim response or via separate endpoint
  return request<any[]>('GET', `/pilgrims/${pilgrimId}/documents`);
}

export async function apiDeleteDocument(id: string) {
  return request<any>('DELETE', `/documents/${id}`);
}

// ====== PAYMENTS ======
export async function apiAddPayment(pilgrimId: string, amount: number, method?: string) {
  return request<any>('POST', `/pilgrims/${pilgrimId}/payments`, { amount, method });
}

export async function apiGetPayments(pilgrimId: string) {
  return request<any[]>('GET', `/pilgrims/${pilgrimId}/payments`);
}

export async function apiGetReceipts(pilgrimId: string) {
  return request<any[]>('GET', `/pilgrims/${pilgrimId}/receipts`);
}

// ====== LEADERS ======
export async function apiGetLeaders() {
  return request<any[]>('GET', '/leaders');
}

export async function apiCreateLeader(data: any) {
  return request<any>('POST', '/leaders', data);
}

export async function apiUpdateLeader(id: string, data: any) {
  return request<any>('PATCH', `/leaders/${id}`, data);
}

export async function apiDeleteLeader(id: string) {
  return request<any>('DELETE', `/leaders/${id}`);
}

// ====== USERS ======
export async function apiGetUsers() {
  return request<any[]>('GET', '/users');
}

export async function apiCreateUser(data: any) {
  return request<any>('POST', '/users', data);
}

export async function apiDeleteUser(id: string) {
  return request<any>('DELETE', `/users/${id}`);
}

// ====== AUDIT ======
export async function apiGetAuditLogs(limit = 100) {
  return request<any[]>('GET', `/audit-logs?limit=${limit}`);
}

export async function apiGetPilgrimAudit(pilgrimId: string) {
  return request<any[]>('GET', `/pilgrims/${pilgrimId}/audit`);
}

// ====== TELEGRAM ======
export async function apiGetTelegramNotifications() {
  return request<any[]>('GET', '/telegram');
}

// Check if backend is available
export async function checkBackend(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, { method: 'GET' });
    return response.status !== 502 && response.status !== 503;
  } catch {
    return false;
  }
}
