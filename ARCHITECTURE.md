# 🏗️ Архитектура системы CRM «Паломники»

## 📋 Обзор

Система построена по модульному принципу с чётким разделением ответственности. Это позволяет легко добавлять новые функции без изменения существующего кода.

---

## 🎯 Принципы архитектуры

### 1. Модульность
Каждая функция реализована в отдельном модуле:
- **Типы** (`src/types/`) - определения данных
- **Хранилище** (`src/store/`) - работа с данными
- **API** (`src/api/`) - взаимодействие с backend
- **Утилиты** (`src/utils/`) - вспомогательные функции
- **Компоненты** (`src/components/`) - UI компоненты

### 2. Разделение данных и представления
- **Данные** хранятся в `database.ts` (localStorage) или backend (SQLite)
- **Компоненты** только отображают данные и отправляют действия
- **Data Provider** (`dataProvider.ts`) абстрагирует источник данных

### 3. Расширяемость
- **Пользовательские колонки** - можно добавлять без изменения кода
- **Настройки** - все конфигурации в одном месте
- **Шаблоны** - квитанции, уведомления можно настраивать

---

## 📁 Структура проекта

```
pilgrims-crm/
├── src/                          # Frontend (React/TypeScript)
│   ├── types/                    # Определения типов
│   │   └── index.ts             # Все интерфейсы и типы
│   │
│   ├── store/                    # Работа с данными
│   │   └── database.ts          # localStorage операции
│   │
│   ├── api/                      # API слой
│   │   ├── client.ts            # HTTP клиент для backend
│   │   └── dataProvider.ts      # Абстракция источника данных
│   │
│   ├── utils/                    # Утилиты
│   │   ├── phone.ts             # Форматирование телефонов
│   │   ├── numberToWords.ts     # Сумма прописью
│   │   ├── validation.ts        # Валидация данных
│   │   └── pdfExport.ts         # Экспорт в PDF
│   │
│   ├── components/               # UI компоненты
│   │   ├── LoginPage.tsx        # Авторизация
│   │   ├── Dashboard.tsx        # Главная страница
│   │   ├── PilgrimTable.tsx     # Таблица паломников
│   │   ├── PilgrimCard.tsx      # Карточка паломника
│   │   ├── CreatePilgrim.tsx    # Создание паломника
│   │   ├── AdminPanel.tsx       # Админ-панель
│   │   ├── SettingsPage.tsx     # Настройки
│   │   ├── CustomColumnsManager.tsx  # Управление колонками
│   │   ├── TagsManager.tsx      # Управление тегами
│   │   ├── ReceiptTemplateEditor.tsx # Редактор квитанций
│   │   └── NotificationProvider.tsx  # Уведомления
│   │
│   ├── App.tsx                   # Главный компонент
│   ├── main.tsx                  # Точка входа
│   └── index.css                 # Глобальные стили
│
├── backend/                      # Backend (Node.js/Express)
│   ├── server.js                # Основной сервер
│   ├── package.json             # Зависимости
│   └── .env                     # Конфигурация
│
├── public/                       # Статические файлы
├── index.html                    # HTML шаблон
├── package.json                  # Frontend зависимости
├── tsconfig.json                 # TypeScript конфиг
├── vite.config.ts                # Vite конфиг
└── README.md                     # Документация
```

---

## 🔄 Поток данных

### Локальный режим (localStorage):
```
Component → Action → database.ts → localStorage
                ↓
         updatePilgrim() → update state → re-render
```

### Серверный режим (backend):
```
Component → Action → dataProvider.ts → client.ts → Backend API
                ↓                                      ↓
         updatePilgrim() ←────────────────────── SQLite DB
                ↓
         update state → re-render
```

---

## 🎨 Как добавить новую функцию

### Пример: Добавление нового поля "Email"

#### Шаг 1: Обновить типы
```typescript
// src/types/index.ts
export interface Pilgrim {
  // ... существующие поля
  email?: string;  // Новое поле
}
```

#### Шаг 2: Обновить хранилище
```typescript
// src/store/database.ts
export function createPilgrim(data: Partial<Pilgrim>): Pilgrim {
  const pilgrim: Pilgrim = {
    // ... существующие поля
    email: data.email || '',  // Новое поле
  };
  // ...
}
```

#### Шаг 3: Обновить UI
```typescript
// src/components/CreatePilgrim.tsx
<div>
  <label>Email</label>
  <input 
    type="email"
    value={form.email}
    onChange={e => setForm({ ...form, email: e.target.value })}
  />
</div>
```

#### Шаг 4: Обновить таблицу (опционально)
```typescript
// src/components/PilgrimTable.tsx
const COLUMN_DEFS = [
  // ... существующие колонки
  { key: 'email', label: 'Email', width: 200, sortable: true },
];
```

#### Шаг 5: Обновить backend (если используется)
```javascript
// backend/server.js
app.post('/api/pilgrims', (req, res) => {
  const { email } = req.body;  // Новое поле
  db.prepare('INSERT INTO pilgrims (..., email) VALUES (?, ..., ?)')
    .run(..., email);
});
```

---

## 🧩 Модули системы

### 1. Система управления колонками
**Файлы:** `CustomColumnsManager.tsx`, `PilgrimTable.tsx`

**Как работает:**
- Пользователь создаёт колонку в настройках
- Колонка сохраняется в `settings.customColumns`
- Таблица динамически рендерит колонки из `COLUMN_DEFS`
- Данные хранятся в `pilgrim.customData`

**Как расширить:**
```typescript
// Добавить новый тип колонки
export type CustomColumnType = 
  | 'text' | 'number' | 'date' | 'select' 
  | 'checkbox' | 'url' | 'email'
  | 'phone' | 'currency' | 'progress';  // Новые типы

// Обновить рендеринг
if (column.type === 'progress') {
  return <ProgressBar value={value} />;
}
```

### 2. Система тегов
**Файлы:** `TagsManager.tsx`, `PilgrimCard.tsx`, `PilgrimTable.tsx`

**Как работает:**
- Теги создаются в настройках
- Сохраняются в `settings.availableTags`
- Паломники имеют массив `tags: string[]`
- Отображаются как цветные бейджи

**Как расширить:**
```typescript
// Добавить категории тегов
export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;  // Новая категория
  icon?: string;      // Иконка
}
```

### 3. Система уведомлений
**Файлы:** `NotificationProvider.tsx`

**Как работает:**
```typescript
const { success, error, info, warning } = useNotification();
success('Операция выполнена');
error('Произошла ошибка');
```

**Как расширить:**
```typescript
// Добавить новые типы уведомлений
export type NotificationType = 
  | 'success' | 'error' | 'info' | 'warning'
  | 'confirm' | 'loading';  // Новые типы

// Добавить действия в уведомления
success('Сохранено', {
  action: 'Отменить',
  onAction: () => undo()
});
```

### 4. Система экспорта
**Файлы:** `pdfExport.ts`

**Как работает:**
```typescript
import { exportPilgrimToPDF } from '../utils/pdfExport';
exportPilgrimToPDF(pilgrim);
```

**Как расширить:**
```typescript
// Добавить новый формат экспорта
export function exportToExcel(pilgrims: Pilgrim[]) {
  // Использовать библиотеку xlsx
}

export function exportToCSV(pilgrims: Pilgrim[]) {
  // Генерация CSV
}
```

---

## 🔌 API архитектура

### Endpoints
```
POST   /api/auth/login          - Авторизация
GET    /api/auth/me             - Текущий пользователь

GET    /api/pilgrims            - Список паломников
POST   /api/pilgrims            - Создать паломника
GET    /api/pilgrims/:id        - Получить паломника
PATCH  /api/pilgrims/:id        - Обновить паломника
DELETE /api/pilgrims/:id        - Удалить паломника

GET    /api/leaders             - Список руководителей
POST   /api/leaders             - Создать руководителя
DELETE /api/leaders/:id         - Удалить руководителя

GET    /api/users               - Список пользователей
POST   /api/users               - Создать пользователя
DELETE /api/users/:id           - Удалить пользователя

GET    /api/pilgrims/:id/payments  - История оплат
POST   /api/pilgrims/:id/payments  - Добавить оплату

GET    /api/settings            - Получить настройки
POST   /api/settings            - Обновить настройки

GET    /api/health              - Проверка работоспособности
```

### Как добавить новый endpoint
```javascript
// backend/server.js
app.get('/api/new-feature', authenticate, (req, res) => {
  const data = db.prepare('SELECT * FROM new_table').all();
  res.json(data);
});

app.post('/api/new-feature', authenticate, (req, res) => {
  const { field1, field2 } = req.body;
  db.prepare('INSERT INTO new_table (field1, field2) VALUES (?, ?)')
    .run(field1, field2);
  res.json({ success: true });
});
```

---

## 💾 Структура данных

### Pilgrim (Паломник)
```typescript
{
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
  programType: 'direct' | 'economy';
  tags: string[];
  hasPhoto: boolean;
  hasPassport: boolean;
  hasRegistration: boolean;
  hasForeignPassport: boolean;
  customData: Record<string, any>;  // Пользовательские поля
  comments: string;
  additionalComments: string;
  documentStatus: 'complete' | 'incomplete';
  paymentStatus: 'not_paid' | 'partial' | 'paid' | 'overpaid';
  uploadStatus: '' | 'reserve' | 'main';
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

### Как добавить новое поле
1. Добавить в интерфейс `Pilgrim`
2. Добавить в `createPilgrim()` и `updatePilgrim()`
3. Добавить в backend схему
4. Добавить UI компонент

---

## 🎨 Компоненты

### Иерархия компонентов
```
App
├── LoginPage
├── Dashboard
├── PilgrimTable
│   ├── Filters
│   ├── ColumnPicker
│   └── BulkActions
├── PilgrimCard
│   ├── InfoTab
│   ├── DocumentsTab
│   ├── PaymentsTab
│   └── HistoryTab
├── CreatePilgrim
├── AdminPanel
│   ├── UsersTab
│   ├── LeadersTab
│   └── AuditLogTab
└── SettingsPage
    ├── GeneralTab
    ├── ProgramsTab
    ├── TagsTab
    ├── ColumnsTab
    ├── ConnectionTab
    ├── CompanyTab
    ├── TelegramTab
    └── BackupTab
```

### Как создать новый компонент
```typescript
// src/components/NewFeature.tsx
import React, { useState } from 'react';

interface NewFeatureProps {
  // Props
}

export default function NewFeature({ }: NewFeatureProps) {
  const [state, setState] = useState();
  
  return (
    <div>
      {/* UI */}
    </div>
  );
}
```

---

## 🔐 Безопасность

### Аутентификация
- JWT токены с временем жизни 24 часа
- Хеширование паролей bcrypt (10 раундов)
- Middleware `authenticate` для защиты routes

### Авторизация
- Роли: admin, employee, leader
- Проверка прав в каждом endpoint
- Leader видит только своих паломников

### Как добавить новую проверку
```javascript
// backend/server.js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

app.post('/api/admin-only', authenticate, requireRole('admin'), (req, res) => {
  // Только для админов
});
```

---

## 🚀 Развёртывание

### Локальная разработка
```bash
# Frontend
npm install
npm run dev

# Backend (в другом терминале)
cd backend
npm install
npm start
```

### Production
```bash
# Сборка frontend
npm run build

# Запуск backend
cd backend
NODE_ENV=production npm start

# Или использовать Docker
docker-compose up -d
```

---

## 📊 Мониторинг и логирование

### Добавление логирования
```javascript
// backend/server.js
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});
```

### Добавление метрик
```javascript
// backend/server.js
const metrics = {
  requests: 0,
  errors: 0
};

app.use((req, res, next) => {
  metrics.requests++;
  next();
});

app.get('/api/metrics', (req, res) => {
  res.json(metrics);
});
```

---

## 🧪 Тестирование

### Unit тесты
```typescript
// src/__tests__/validation.test.ts
import { validatePhone } from '../utils/validation';

describe('validatePhone', () => {
  it('должен валидировать корректный номер', () => {
    expect(validatePhone('+7 (917) 123-45-67')).toBe(true);
  });
  
  it('должен отклонять некорректный номер', () => {
    expect(validatePhone('123')).toBe(false);
  });
});
```

### Integration тесты
```javascript
// backend/__tests__/api.test.js
const request = require('supertest');
const app = require('../server');

describe('POST /api/pilgrims', () => {
  it('должен создать паломника', async () => {
    const res = await request(app)
      .post('/api/pilgrims')
      .send({ lastName: 'Тестов', firstName: 'Тест' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.lastName).toBe('Тестов');
  });
});
```

---

## 📚 Полезные ссылки

- **React Docs:** https://react.dev/
- **TypeScript Docs:** https://www.typescriptlang.org/docs/
- **Express Docs:** https://expressjs.com/
- **SQLite Docs:** https://www.sqlite.org/docs.html
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## 🎯 Чек-лист для разработчиков

Перед добавлением новой функции проверьте:

- [ ] Обновлены типы в `src/types/index.ts`
- [ ] Обновлено хранилище в `src/store/database.ts`
- [ ] Обновлён backend в `backend/server.js`
- [ ] Создан UI компонент
- [ ] Добавлена валидация
- [ ] Добавлены тесты
- [ ] Обновлена документация
- [ ] Проверена безопасность
- [ ] Проверена производительность

---

**Система готова к расширению!** 🚀

Любую новую функцию можно добавить следуя этому руководству. Архитектура модульная и гибкая, что позволяет легко развивать проект.
