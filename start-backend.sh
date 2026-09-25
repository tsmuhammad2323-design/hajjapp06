#!/bin/bash
# Скрипт запуска backend сервера

echo "🖥️  Backend CRM Паломники"
echo "========================="

cd backend

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

# Создание .env если нет
if [ ! -f .env ]; then
    echo "📝 Создание .env файла..."
    cp .env.example .env
    echo "⚠️  Отредактируйте backend/.env и измените JWT_SECRET!"
fi

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

echo ""
echo "🚀 Запуск сервера..."
echo "   API: http://localhost:3001"
echo ""
echo "📋 Демо-доступ:"
echo "   Админ: admin / admin123"
echo "   Сотрудник: employee / emp123"
echo "   Руководитель: ahmedov / lead123"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo ""

npm start
