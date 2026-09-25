// Форматирование телефона в формат +7 (XXX) XXX-XX-XX
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  let cleanDigits = digits;
  if (cleanDigits.startsWith('8')) {
    cleanDigits = '7' + cleanDigits.slice(1);
  }
  
  if (!cleanDigits.startsWith('7') && cleanDigits.length > 0) {
    cleanDigits = '7' + cleanDigits;
  }
  
  cleanDigits = cleanDigits.slice(0, 11);
  
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

export function extractPhoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function isValidPhone(value: string): boolean {
  const digits = extractPhoneDigits(value);
  return digits.length === 11 && digits.startsWith('7');
}

export function displayPhone(value: string): string {
  if (!value) return '';
  if (value.includes('(') || value.includes(')')) {
    return value;
  }
  return formatPhone(value);
}
