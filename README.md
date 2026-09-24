# CRM Паломники — Система учёта

## Описание

Полнофункциональное веб-приложение для учёта паломников в офисе. Заменяет ручной учёт и объединяет данные о паломниках, руководителях, документах, оплатах, квитанциях, истории изменений и Telegram-уведомлениях.

## Демо-доступ

| Роль | Логин | Пароль |
|------|-------|--------|
| Администратор | admin | admin123 |
| Сотрудник | employee | emp123 |
| Руководитель | ahmedov | lead123 |

## Возможности

### Основной функционал
- **Таблица паломников** — inline-редактирование, поиск, фильтрация, сортировка, массовые действия
- **Карточка паломника** — полная информация, документы, оплата, история
- **Документы** — загрузка/замена/удаление 4 типов (фото, паспорт, прописка, загранпаспорт)
- **Оплата** — приём платежей, автоматические квитанции, печать
- **Статусы** — автоматическое вычисление статуса документов и оплаты
- **История изменений** — полный audit log всех действий

### Управление
- **Роли** — Администратор, Сотрудник, Руководитель
- **Разграничение доступа** — руководитель видит только своих паломников
- **Telegram-уведомления** — автоматические уведомления руководителям
- **Экспорт** — выгрузка данных в CSV
- **Дашборд** — обзорная статистика

### Массовые операции
- Смена руководителя для группы паломников
- Изменение статуса загрузки
- Архивирование
- Удаление

## Архитектура

### Текущая реализация (Frontend-only)
```
Browser → React SPA → localStorage (эмуляция БД)
```

### Production-архитектура (рекомендуемая)
```
Browser → React SPA → Nginx → Node.js/FastAPI → PostgreSQL + S3 + Telegram API
```

### Технологический стек

**Frontend (реализован):**
- React 18 + TypeScript
- Tailwind CSS 4
- Vite
- Lucide React (иконки)
- date-fns (даты)
- uuid (идентификаторы)

**Backend (рекомендуемый для production):**
- Node.js + Express / Python + FastAPI
- PostgreSQL 15+
- JWT авторизация
- S3-совместимое хранилище (MinIO)
- Telegram Bot API

## Структура данных

### Сущности
- **Pilgrim** (Паломник) — основная запись
- **Leader** (Руководитель) — привязка паломника к группе
- **Document** (Документ) — файл, привязанный к паломнику
- **Payment** (Оплата) — история платежей
- **Receipt** (Квитанция) — формируемый документ
- **AuditLog** (Журнал) — история всех действий
- **TelegramNotification** — лог уведомлений
- **User** — пользователь системы

### Связи
```
Pilgrim → Leader (многие-к-одному)
Pilgrim → Document[] (один-ко-многим, 4 типа)
Pilgrim → Payment[] (один-ко-многим)
Payment → Receipt (один-к-одному)
Pilgrim → AuditLog[] (один-ко-многим)
```

## API-контракт (для production)

### Авторизация
```
POST /api/auth/login       — вход
POST /api/auth/logout      — выход
GET  /api/auth/me          — текущий пользователь
```

### Паломники
```
GET    /api/pilgrims              — список (с фильтрами)
POST   /api/pilgrims              — создать
GET    /api/pilgrims/:id          — получить
PATCH  /api/pilgrims/:id          — обновить
DELETE /api/pilgrims/:id          — удалить
POST   /api/pilgrims/:id/archive  — архивировать
POST   /api/pilgrims/bulk         — массовые действия
```

### Документы
```
POST   /api/pilgrims/:id/documents/:type  — загрузить
DELETE /api/documents/:id                  — удалить
GET    /api/documents/:id                  — скачать
```

### Оплата
```
POST /api/pilgrims/:id/payments     — добавить оплату
GET  /api/pilgrims/:id/payments     — история оплат
GET  /api/receipts/:id/print        — печать квитанции
```

### Руководители
```
GET    /api/leaders       — список
POST   /api/leaders       — создать
PATCH  /api/leaders/:id   — обновить
DELETE /api/leaders/:id   — удалить
```

### Администрирование
```
GET    /api/users         — список пользователей
POST   /api/users         — создать
PATCH  /api/users/:id     — обновить
DELETE /api/users/:id     — удалить
GET    /api/audit-logs    — журнал действий
GET    /api/telegram      — уведомления
```

## Схема PostgreSQL (production)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee', 'leader')),
    leader_id UUID REFERENCES leaders(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leaders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    telegram_chat_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pilgrims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_number VARCHAR(20),
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    birth_date DATE,
    passport_expiry DATE,
    phone VARCHAR(20),
    total_amount DECIMAL(12,2) DEFAULT 0,
    leader_id UUID NOT NULL REFERENCES leaders(id),
    comments TEXT,
    additional_comments TEXT,
    document_status VARCHAR(20) DEFAULT 'incomplete',
    payment_status VARCHAR(20) DEFAULT 'not_paid',
    upload_status VARCHAR(20) DEFAULT '',
    is_archived BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pilgrim_id UUID NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('photo', 'passport', 'registration', 'foreign_passport')),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    storage_path VARCHAR(500),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    UNIQUE(pilgrim_id, type)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pilgrim_id UUID NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    paid_by UUID REFERENCES users(id),
    method VARCHAR(50) DEFAULT 'cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(20) UNIQUE NOT NULL,
    pilgrim_id UUID NOT NULL REFERENCES pilgrims(id),
    payment_id UUID NOT NULL REFERENCES payments(id),
    amount DECIMAL(12,2) NOT NULL,
    pilgrim_name VARCHAR(300),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    object_type VARCHAR(50) NOT NULL,
    object_id UUID NOT NULL,
    object_name VARCHAR(300),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(200),
    old_value TEXT,
    new_value TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE telegram_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_id UUID NOT NULL REFERENCES leaders(id),
    pilgrim_id UUID NOT NULL REFERENCES pilgrims(id),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_pilgrims_leader ON pilgrims(leader_id);
CREATE INDEX idx_pilgrims_archived ON pilgrims(is_archived);
CREATE INDEX idx_pilgrims_doc_status ON pilgrims(document_status);
CREATE INDEX idx_pilgrims_pay_status ON pilgrims(payment_status);
CREATE INDEX idx_pilgrims_name ON pilgrims(last_name, first_name);
CREATE INDEX idx_documents_pilgrim ON documents(pilgrim_id);
CREATE INDEX idx_payments_pilgrim ON payments(pilgrim_id);
CREATE INDEX idx_audit_object ON audit_logs(object_id, object_type);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

## Docker-конфигурация (production)

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pilgrims_crm
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://crm_user:${DB_PASSWORD}@db:5432/pilgrims_crm
      JWT_SECRET: ${JWT_SECRET}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      UPLOAD_DIR: /app/uploads
    volumes:
      - uploads:/app/uploads
    ports:
      - "3001:3001"
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
  uploads:
```

## Развёртывание в офисе

### Минимальные требования
- Сервер: 4 ГБ RAM, 2 ядра CPU, 50 ГБ SSD
- ОС: Ubuntu 22.04 / Debian 12
- Docker + Docker Compose

### Шаги развёртывания
```bash
# 1. Клонировать репозиторий
git clone <repo-url> && cd pilgrims-crm

# 2. Создать .env
cat > .env << EOF
DB_PASSWORD=strong_password_here
JWT_SECRET=random_secret_string
TELEGRAM_BOT_TOKEN=your_bot_token
EOF

# 3. Запустить
docker-compose up -d

# 4. Создать первого администратора (автоматически через seed)
# Логин: admin, Пароль: admin123
```

### Резервное копирование
```bash
# Ежедневный бэкап PostgreSQL
docker-compose exec db pg_dump -U crm_user pilgrims_crm > backup_$(date +%Y%m%d).sql

# Бэкап загруженных файлов
tar -czf uploads_$(date +%Y%m%d).tar.gz /path/to/uploads
```

### Восстановление
```bash
# Восстановление БД
cat backup_20240101.sql | docker-compose exec -T db psql -U crm_user pilgrims_crm

# Восстановление файлов
tar -xzf uploads_20240101.tar.gz -C /path/to/uploads
```

## Чек-лист перед вводом в эксплуатацию

- [ ] Смените пароль администратора по умолчанию
- [ ] Настройте HTTPS (Let's Encrypt)
- [ ] Настройте регулярное резервное копирование
- [ ] Создайте аккаунты для всех сотрудников
- [ ] Создайте руководителей и привяжите Telegram
- [ ] Проверьте права доступа для каждой роли
- [ ] Протестируйте массовые операции
- [ ] Настройте firewall (открыть только 80/443)
- [ ] Проверьте работу на всех 4 рабочих станциях
- [ ] Настройте мониторинг (Uptime Kuma / Zabbix)

## Безопасность

- Пароли хешируются (bcrypt в production)
- JWT-токены с ограниченным временем жизни
- Серверная валидация всех входных данных
- Ролевая модель доступа (RBAC)
- Руководитель не может получить данные чужих паломников
- Защита от CSRF
- Rate limiting на API
- Ограничение размера загружаемых файлов (10 МБ)
- Проверка MIME-типов файлов

## Лицензия

Внутреннее использование.
