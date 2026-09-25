const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

async function request<T>(method: string, url: string, data?: any): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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

// Auth
export async function apiLogin(login: string, password: string) {
  const result = await request<{ token: string; user: any }>('POST', '/auth/login', { login, password });
  setAuthToken(result.token);
  return result;
}

export async function apiGetMe() {
  return request<any>('GET', '/auth/me');
}

// Pilgrims
export async function apiGetPilgrims() {
  return request<any[]>('GET', '/pilgrims');
}

export async function apiGetArchivedPilgrims() {
  return request<any[]>('GET', '/pilgrims/archived');
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

export async function apiRestorePilgrim(id: string) {
  return request<any>('POST', `/pilgrims/${id}/restore`);
}

export async function apiDeletePilgrim(id: string) {
  return request<any>('DELETE', `/pilgrims/${id}`);
}

// Leaders
export async function apiGetLeaders() {
  return request<any[]>('GET', '/leaders');
}

export async function apiCreateLeader(data: any) {
  return request<any>('POST', '/leaders', data);
}

export async function apiDeleteLeader(id: string) {
  return request<any>('DELETE', `/leaders/${id}`);
}

// Users
export async function apiGetUsers() {
  return request<any[]>('GET', '/users');
}

export async function apiCreateUser(data: any) {
  return request<any>('POST', '/users', data);
}

export async function apiDeleteUser(id: string) {
  return request<any>('DELETE', `/users/${id}`);
}

// Payments
export async function apiGetPayments(pilgrimId: string) {
  return request<any[]>('GET', `/pilgrims/${pilgrimId}/payments`);
}

export async function apiAddPayment(pilgrimId: string, amount: number, method?: string) {
  return request<any>('POST', `/pilgrims/${pilgrimId}/payments`, { amount, method });
}

// Receipts
export async function apiGetReceipts(pilgrimId: string) {
  return request<any[]>('GET', `/pilgrims/${pilgrimId}/receipts`);
}

// Audit logs
export async function apiGetAuditLogs() {
  return request<any[]>('GET', '/audit-logs');
}

// Health check
export async function checkBackend(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
