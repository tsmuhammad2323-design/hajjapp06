#!/bin/bash
# Скрипт быстрого запуска CRM Паломники на ПК

echo "🚀 CRM Паломники — Локальный запуск"
echo "===================================="

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Скачайте с https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Установка зависимостей
echo ""
echo "📦 Установка зависимостей..."
npm install

# Сборка
echo ""
echo "🔨 Сборка production-версии..."
npm run build

echo ""
echo "✅ Готово! Файлы в папке dist/"
echo ""
echo "🌐 Варианты запуска:"
echo "   1. Откройте dist/index.html в браузере (данные в localStorage)"
echo "   2. Запустите backend для многопользовательского режима:"
echo "      cd backend && npm install && npm start"
echo ""
echo "📋 Демо-доступ:"
echo "   Админ: admin / admin123"
echo "   Сотрудник: employee / emp123"
echo "   Руководитель: ahmedov / lead123"
echo ""
