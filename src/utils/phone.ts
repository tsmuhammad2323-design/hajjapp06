// Форматирование телефона в формат +7 (XXX) XXX-XX-XX
export function formatPhone(value: string): string {
  // Убираем все кроме цифр
  const digits = value.replace(/\D/g, '');
  
  // Если начинается с 8, заменяем на 7
  let cleanDigits = digits;
  if (cleanDigits.startsWith('8')) {
    cleanDigits = '7' + cleanDigits.slice(1);
  }
  
  // Если не начинается с 7, добавляем 7
  if (!cleanDigits.startsWith('7') && cleanDigits.length > 0) {
    cleanDigits = '7' + cleanDigits;
  }
  
  // Ограничиваем до 11 цифр (7 + 10 цифр номера)
  cleanDigits = cleanDigits.slice(0, 11);
  
  // Форматируем
  let formatted = '';
  
  if (cleanDigits.length === 0) return '';
  
  formatted = '+7';
  
  if (cleanDigits.length > 1) {
    formatted += ' (' + cleanDigits.slice(1, 4);
  }
  
  if (cleanDigits.length >= 4) {
    formatted += ')';
  }
  
  if (cleanDigits.length > 4) {
    formatted += ' ' + cleanDigits.slice(4, 7);
  }
  
  if (cleanDigits.length > 7) {
    formatted += '-' + cleanDigits.slice(7, 9);
  }
  
  if (cleanDigits.length > 9) {
    formatted += '-' + cleanDigits.slice(9, 11);
  }
  
  return formatted;
}

// Извлечение цифр из отформатированного номера
export function extractPhoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

// Валидация телефона
export function isValidPhone(value: string): boolean {
  const digits = extractPhoneDigits(value);
  return digits.length === 11 && digits.startsWith('7');
}

// Форматирование для отображения (если уже сохранен)
export function displayPhone(value: string): string {
  if (!value) return '';
  // Если уже отформатирован
  if (value.includes('(') || value.includes(')')) {
    return value;
  }
  // Если только цифры
  return formatPhone(value);
}
