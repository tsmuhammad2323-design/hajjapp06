/**
 * Утилиты для валидации данных
 */

// Валидация телефона
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: false, error: 'Телефон обязателен' };
  
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) {
    return { valid: false, error: 'Телефон должен содержать 11 цифр' };
  }
  
  if (!digits.startsWith('7')) {
    return { valid: false, error: 'Телефон должен начинаться с +7' };
  }
  
  return { valid: true };
}

// Валидация email
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: true };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Некорректный формат email' };
  }
  
  return { valid: true };
}

// Валидация даты
export function validateDate(date: string, options: { 
  required?: boolean; 
  minDate?: string; 
  maxDate?: string;
  notFuture?: boolean;
  notPast?: boolean;
} = {}): { valid: boolean; error?: string } {
  if (!date) {
    return options.required ? { valid: false, error: 'Дата обязательна' } : { valid: true };
  }
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Некорректная дата' };
  }
  
  if (options.minDate) {
    const min = new Date(options.minDate);
    if (dateObj < min) {
      return { valid: false, error: `Дата должна быть не ранее ${min.toLocaleDateString('ru-RU')}` };
    }
  }
  
  if (options.maxDate) {
    const max = new Date(options.maxDate);
    if (dateObj > max) {
      return { valid: false, error: `Дата должна быть не позднее ${max.toLocaleDateString('ru-RU')}` };
    }
  }
  
  const now = new Date();
  if (options.notFuture && dateObj > now) {
    return { valid: false, error: 'Дата не может быть в будущем' };
  }
  
  if (options.notPast && dateObj < now) {
    return { valid: false, error: 'Дата не может быть в прошлом' };
  }
  
  return { valid: true };
}

// Валидация суммы
export function validateAmount(amount: number | string, options: {
  required?: boolean;
  min?: number;
  max?: number;
} = {}): { valid: boolean; error?: string } {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return options.required ? { valid: false, error: 'Сумма обязательна' } : { valid: true };
  }
  
  if (options.min !== undefined && num < options.min) {
    return { valid: false, error: `Сумма должна быть не менее ${options.min}` };
  }
  
  if (options.max !== undefined && num > options.max) {
    return { valid: false, error: `Сумма должна быть не более ${options.max}` };
  }
  
  return { valid: true };
}

// Валидация ФИО
export function validateFullName(lastName: string, firstName: string, middleName?: string): { 
  valid: boolean; 
  error?: string 
} {
  if (!lastName || !firstName) {
    return { valid: false, error: 'Фамилия и имя обязательны' };
  }
  
  const nameRegex = /^[А-ЯЁа-яёA-Za-z\s-]+$/;
  
  if (!nameRegex.test(lastName)) {
    return { valid: false, error: 'Фамилия содержит недопустимые символы' };
  }
  
  if (!nameRegex.test(firstName)) {
    return { valid: false, error: 'Имя содержит недопустимые символы' };
  }
  
  if (middleName && !nameRegex.test(middleName)) {
    return { valid: false, error: 'Отчество содержит недопустимые символы' };
  }
  
  if (lastName.length < 2 || firstName.length < 2) {
    return { valid: false, error: 'ФИО слишком короткое' };
  }
  
  return { valid: true };
}

// Проверка уникальности телефона
export function checkPhoneUniqueness(phone: string, existingPhones: string[], currentId?: string): { 
  unique: boolean; 
  error?: string 
} {
  const normalizedPhone = phone.replace(/\D/g, '');
  
  const duplicate = existingPhones.find(p => {
    const normalized = p.replace(/\D/g, '');
    return normalized === normalizedPhone;
  });
  
  if (duplicate && duplicate !== currentId) {
    return { unique: false, error: 'Этот телефон уже используется другим паломником' };
  }
  
  return { unique: true };
}

// Комплексная валидация паломника
export function validatePilgrim(data: {
  lastName: string;
  firstName: string;
  middleName?: string;
  phone: string;
  birthDate: string;
  passportExpiry: string;
  totalAmount: number;
  leaderId: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const fullNameValidation = validateFullName(data.lastName, data.firstName, data.middleName);
  if (!fullNameValidation.valid) {
    errors.push(fullNameValidation.error!);
  }
  
  const phoneValidation = validatePhone(data.phone);
  if (!phoneValidation.valid) {
    errors.push(phoneValidation.error!);
  }
  
  const birthDateValidation = validateDate(data.birthDate, { 
    required: true, 
    notFuture: true,
    minDate: '1900-01-01'
  });
  if (!birthDateValidation.valid) {
    errors.push(`Дата рождения: ${birthDateValidation.error}`);
  }
  
  const passportValidation = validateDate(data.passportExpiry, { 
    required: true,
    notPast: true
  });
  if (!passportValidation.valid) {
    errors.push(`Срок паспорта: ${passportValidation.error}`);
  }
  
  const amountValidation = validateAmount(data.totalAmount, { 
    required: true, 
    min: 0,
    max: 10000000
  });
  if (!amountValidation.valid) {
    errors.push(amountValidation.error!);
  }
  
  if (!data.leaderId) {
    errors.push('Руководитель не выбран');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
