# 🚀 CRM Паломники — Инструкция по запуску

## 📋 Содержание
1. [Быстрый старт (демо)](#быстрый-старт-демо)
2. [Запуск на ПК (локально)](#запуск-на-пк-локально)
3. [Запуск на сервере (постоянный доступ)](#запуск-на-сервере-постоянный-доступ)
4. [Настройка Telegram](#настройка-telegram)
5. [Резервное копирование](#резервное-копирование)
6. [Тестирование](#тестирование)

---

## ⚡ Быстрый старт (демо)

Текущая версия работает прямо в браузере — данные хранятся в localStorage.

**Демо-доступ:**
- **Администратор:** `admin` / `admin123`
- **Сотрудник:** `employee` / `emp123`
- **Руководитель:** `ahmedov` / `lead123`

Просто откройте `dist/index.html` в браузере после сборки.

---

## 💻 Запуск на ПК (локально)

### Требования
- **Node.js 18+** — [скачать](https://nodejs.org/)
- **Git** — [скачать](https://git-scm.com/)

### Шаг 1: Скачайте проект

```bash
# Если проект в архиве — распакуйте
# Или клонируйте из git:
git clone <url-репозитория>
cd pilgrims-crm
```

### Шаг 2: Установите зависимости

```bash
npm install
```

### Шаг 3: Запустите в режиме разработки

```bash
npm run dev
```

Откройте в браузере: **http://localhost:5173**

### Шаг 4: Соберите production-версию

```bash
npm run build
```

Результат будет в папке `dist/`. Эти файлы можно открыть напрямую или разместить на веб-сервере.

### Шаг 5 (опционально): Запуск backend с базой данных

Для полноценной работы с несколькими компьютерами:

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env — измените JWT_SECRET
npm start
```

Backend запустится на **http://localhost:3001**

---

## 🖥️ Запуск на сервере (постоянный доступ)

### Вариант 1: Docker (рекомендуется)

#### Требования
- **Docker** и **Docker Compose**
- Linux сервер (Ubuntu 22.04 / Debian 12)
- Минимум: 2 ГБ RAM, 2 CPU, 20 ГБ SSD

#### Установка Docker на Ubuntu:
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
```

#### Развертывание:

```bash
# 1. Скачайте проект на сервер
git clone <url> && cd pilgrims-crm

# 2. Создайте .env файл
cp .env.example .env
nano .env
# Измените JWT_SECRET на случайную строку!
# Например: openssl rand -hex 32

# 3. Соберите и запустите
docker-compose up -d --build

# 4. Проверьте статус
docker-compose ps

# 5. Посмотрите логи
docker-compose logs -f
```

Приложение будет доступно по адресу: **http://IP-сервера**

#### Обновление:
```bash
git pull
docker-compose up -d --build
```

#### Остановка:
```bash
docker-compose down
```

### Вариант 2: Без Docker (напрямую)

#### Frontend:
```bash
npm install
npm run build

# Установите nginx
sudo apt install nginx -y

# Скопируйте файлы
sudo cp -r dist/* /var/www/html/

# Настройте nginx (см. nginx.conf)
sudo cp nginx.conf /etc/nginx/sites-available/crm
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Backend:
```bash
cd backend
npm install --production
cp .env.example .env
nano .env

# Запуск через pm2 (для автозапуска)
sudo npm install -g pm2
pm2 start server.js --name crm-backend
pm2 startup
pm2 save
```

---

## 📱 Настройка Telegram

### 1. Создайте бота
1. Откройте Telegram, найдите **@BotFather**
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен бота

### 2. Добавьте токен в .env
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Получите Chat ID руководителей
1. Каждый руководитель должен написать боту `/start`
2. Отправьте запрос: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Найдите `"chat":{"id":123456789}` — это Chat ID
4. Укажите Chat ID в профиле руководителя через админ-панель

### 4. Перезапустите backend
```bash
docker-compose restart backend
# или
pm2 restart crm-backend
```

---

## 💾 Резервное копирование

### Автоматический бэкап (добавьте в cron)

```bash
# Создайте скрипт backup.sh
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

mkdir -p $BACKUP_DIR

# Бэкап базы данных
docker-compose exec -T backend cp /app/crm.db /tmp/crm_backup.db
docker-compose cp backend:/tmp/crm_backup.db $BACKUP_DIR/db_$DATE.db

# Бэкап загруженных файлов
docker-compose exec -T backend tar czf /tmp/uploads_backup.tar.gz uploads/
docker-compose cp backend:/tmp/uploads_backup.tar.gz $BACKUP_DIR/uploads_$DATE.tar.gz

# Удалить бэкапы старше 30 дней
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ Backup completed: $DATE"
EOF

chmod +x backup.sh

# Добавьте в cron (ежедневно в 3:00)
crontab -e
# Добавьте строку:
# 0 3 * * * /path/to/backup.sh >> /var/log/crm_backup.log 2>&1
```

### Ручной бэкап:
```bash
# База данных
docker-compose exec backend cp /app/crm.db /tmp/backup.db
docker-compose cp backend:/tmp/backup.db ./backup_$(date +%Y%m%d).db

# Файлы
docker-compose exec backend tar czf /tmp/files.tar.gz uploads/
docker-compose cp backend:/tmp/files.tar.gz ./files_$(date +%Y%m%d).tar.gz
```

### Восстановление:
```bash
# База данных
docker-compose cp ./backup.db backend:/app/crm.db
docker-compose restart backend

# Файлы
docker-compose cp ./files.tar.gz backend:/tmp/
docker-compose exec backend tar xzf /tmp/files.tar.gz -C /app/
```

---

## ✅ Тестирование

### Чек-лист проверки перед вводом в эксплуатацию

#### Функциональность:
- [ ] Вход под всеми ролями работает
- [ ] Создание паломника
- [ ] Редактирование данных (inline в таблице)
- [ ] Загрузка документов (все 4 типа)
- [ ] Приём оплаты и генерация квитанции
- [ ] Печать квитанции
- [ ] Фильтрация и поиск
- [ ] Массовые действия
- [ ] История изменений
- [ ] Экспорт в CSV

#### Безопасность:
- [ ] Руководитель видит только своих паломников
- [ ] Сотрудник не может управлять пользователями
- [ ] Пароли хешируются
- [ ] JWT-токены работают
- [ ] API защищено авторизацией

#### Производительность:
- [ ] Одновременная работа 4+ пользователей
- [ ] Таблица не тормозит при 100+ записях
- [ ] Файлы загружаются до 10 МБ

#### Развертывание:
- [ ] HTTPS настроен (Let's Encrypt)
- [ ] Резервное копирование работает
- [ ] Telegram-уведомления приходят
- [ ] Firewall настроен (открыты 80/443)

### Тестовые сценарии:

**1. Создание паломника:**
```
Войти как employee → Новый паломник → Заполнить данные → Создать
```

**2. Загрузка документов:**
```
Открыть карточку → Документы → Загрузить все 4 типа → Статус = "Полный"
```

**3. Оплата:**
```
Карточка → Оплата → Ввести сумму → Квитанция создана → Печать
```

**4. Массовые действия:**
```
Таблица → Выбрать 3 паломника → Действия → Сменить руководителя
```

**5. Разграничение доступа:**
```
Войти как ahmedov → Видны только паломники Ахмедова
Попытаться открыть чужого паломника по ID → 403 ошибка
```

---

## 🔧 Решение проблем

### Backend не запускается
```bash
# Проверьте логи
docker-compose logs backend

# Пересоберите
docker-compose up -d --build backend
```

### Не работает авторизация
```bash
# Проверьте JWT_SECRET в .env
# Убедитесь, что frontend обращается к правильному API URL
```

### Файлы не загружаются
```bash
# Проверьте права на папку uploads
docker-compose exec backend ls -la /app/uploads

# Увеличьте лимит в nginx.conf (client_max_body_size)
```

### Telegram не отправляет
```bash
# Проверьте токен бота
curl https://api.telegram.org/bot<TOKEN>/getMe

# Проверьте Chat ID руководителя
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Убедитесь, что все зависимости установлены
3. Проверьте .env конфигурацию
4. Перезапустите сервисы: `docker-compose restart`

---

## 📄 Лицензия

Внутреннее использование.
