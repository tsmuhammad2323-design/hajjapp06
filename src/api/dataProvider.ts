import type { Pilgrim, Leader, User, Payment, Receipt, AuditLogEntry, SystemSettings } from '../types';
import * as localDb from '../store/database';
import * as apiClient from './client';

let useBackendMode = false;

export function setBackendMode(enabled: boolean) {
  useBackendMode = enabled;
  localStorage.setItem('crm_use_backend', enabled ? 'true' : 'false');
}

export function isBackendMode(): boolean {
  return useBackendMode;
}

export function initBackendMode() {
  const saved = localStorage.getItem('crm_use_backend');
  useBackendMode = saved === 'true';
}

// ====== PILGRIMS ======
export async function getPilgrims(): Promise<Pilgrim[]> {
  if (useBackendMode) {
    return await apiClient.apiGetPilgrims();
  }
  return localDb.getPilgrims();
}

export async function getPilgrimsForUser(): Promise<Pilgrim[]> {
  if (useBackendMode) {
    return await apiClient.apiGetPilgrims();
  }
  return localDb.getPilgrimsForUser();
}

export async function getArchivedPilgrims(): Promise<Pilgrim[]> {
  if (useBackendMode) {
    return await apiClient.apiGetArchivedPilgrims();
  }
  return localDb.getArchivedPilgrims();
}

export async function getPilgrim(id: string): Promise<Pilgrim | undefined> {
  if (useBackendMode) {
    return await apiClient.apiGetPilgrim(id);
  }
  return localDb.getPilgrim(id);
}

export async function createPilgrim(data: Partial<Pilgrim>): Promise<Pilgrim> {
  if (useBackendMode) {
    return await apiClient.apiCreatePilgrim(data);
  }
  return localDb.createPilgrim(data);
}

export async function updatePilgrim(id: string, data: Partial<Pilgrim>, checkVersion = true): Promise<Pilgrim> {
  if (useBackendMode) {
    return await apiClient.apiUpdatePilgrim(id, data);
  }
  return localDb.updatePilgrim(id, data, checkVersion);
}

export async function archivePilgrim(id: string): Promise<void> {
  if (useBackendMode) {
    await apiClient.apiArchivePilgrim(id);
    return;
  }
  localDb.archivePilgrim(id);
}

export async function restorePilgrim(id: string): Promise<void> {
  if (useBackendMode) {
    await apiClient.apiRestorePilgrim(id);
    return;
  }
  localDb.restorePilgrim(id);
}

export async function deletePilgrim(id: string): Promise<void> {
  if (useBackendMode) {
    await apiClient.apiDeletePilgrim(id);
    return;
  }
  localDb.deletePilgrim(id);
}

// ====== LEADERS ======
export async function getLeaders(): Promise<Leader[]> {
  if (useBackendMode) {
    return await apiClient.apiGetLeaders();
  }
  return localDb.getLeaders();
}

export async function createLeader(data: any): Promise<Leader> {
  if (useBackendMode) {
    return await apiClient.apiCreateLeader(data);
  }
  return localDb.createLeader(data);
}

export async function deleteLeader(id: string): Promise<void> {
  if (useBackendMode) {
    await apiClient.apiDeleteLeader(id);
    return;
  }
  localDb.deleteLeader(id);
}

// ====== USERS ======
export async function getUsers(): Promise<User[]> {
  if (useBackendMode) {
    return await apiClient.apiGetUsers();
  }
  return localDb.getUsers();
}

export async function createUser(data: any): Promise<User> {
  if (useBackendMode) {
    return await apiClient.apiCreateUser(data);
  }
  return localDb.createUser(data);
}

export async function deleteUser(id: string): Promise<void> {
  if (useBackendMode) {
    await apiClient.apiDeleteUser(id);
    return;
  }
  localDb.deleteUser(id);
}

// ====== PAYMENTS ======
export async function getPayments(pilgrimId?: string): Promise<Payment[]> {
  if (useBackendMode && pilgrimId) {
    return await apiClient.apiGetPayments(pilgrimId);
  }
  return localDb.getPayments(pilgrimId);
}

export async function addPayment(pilgrimId: string, amount: number, method?: string): Promise<Payment> {
  if (useBackendMode) {
    const result = await apiClient.apiAddPayment(pilgrimId, amount, method);
    return result.payment;
  }
  return localDb.addPayment(pilgrimId, amount, method);
}

// ====== RECEIPTS ======
export async function getReceipts(pilgrimId?: string): Promise<Receipt[]> {
  if (useBackendMode && pilgrimId) {
    return await apiClient.apiGetReceipts(pilgrimId);
  }
  return localDb.getReceipts(pilgrimId);
}

// ====== AUDIT LOG ======
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  if (useBackendMode) {
    return await apiClient.apiGetAuditLogs();
  }
  return localDb.getAuditLogs();
}

// ====== AUTH ======
export async function login(loginStr: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  if (useBackendMode) {
    try {
      const result = await apiClient.apiLogin(loginStr, password);
      return { success: true, user: result.user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  return localDb.login(loginStr, password);
}

export function logout() {
  if (useBackendMode) {
    apiClient.setAuthToken(null);
  }
  localDb.logout();
}

export function getSession() {
  return localDb.getSession();
}

export function getUser(id: string) {
  return localDb.getUser(id);
}

// ====== SETTINGS ======
export function getSystemSettings(): SystemSettings {
  return localDb.getSystemSettings();
}

export function updateSystemSettings(settings: Partial<SystemSettings>): SystemSettings {
  return localDb.updateSystemSettings(settings);
}

// ====== SYNC ======
export async function syncFromBackend(): Promise<{ success: boolean; error?: string }> {
  if (!useBackendMode) {
    return { success: false, error: 'Backend режим не включен' };
  }
  
  try {
    const [pilgrims, leaders] = await Promise.all([
      apiClient.apiGetPilgrims(),
      apiClient.apiGetLeaders()
    ]);
    
    // Сохраняем в localStorage как кэш
    localStorage.setItem('crm_pilgrims_cache', JSON.stringify(pilgrims));
    localStorage.setItem('crm_leaders_cache', JSON.stringify(leaders));
    localStorage.setItem('crm_last_sync', new Date().toISOString());
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function checkBackendConnection(): Promise<boolean> {
  return await apiClient.checkBackend();
}

// ====== UTILS ======
export function formatCurrency(amount: number): string {
  return localDb.formatCurrency(amount);
}

export function calculateAge(birthDate: string): number {
  return localDb.calculateAge(birthDate);
}

export function getPassportExpiryStatus(expiryDate: string) {
  return localDb.getPassportExpiryStatus(expiryDate);
}

export function generateNextFolderNumber(): string {
  return localDb.generateNextFolderNumber();
}

export function getAvailableTags() {
  return localDb.getAvailableTags();
}

export function getTagById(id: string) {
  return localDb.getTagById(id);
}

export function getLeader(id: string) {
  return localDb.getLeader(id);
}

export function seedDatabase() {
  localDb.seedDatabase();
}

export function getTheme() {
  return localDb.getTheme();
}

export function setTheme(theme: 'light' | 'dark') {
  localDb.setTheme(theme);
}

export function exportBackup() {
  return localDb.exportBackup();
}

export function importBackup(json: string) {
  return localDb.importBackup(json);
}
