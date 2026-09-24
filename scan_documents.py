#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для сканирования папок с документами паломников
и генерации JSON-файла со статусами для импорта в CRM-систему.

Использование:
1. Укажите путь к папке с документами в переменной DOCS_FOLDER
2. Запустите скрипт: python scan_documents.py
3. Загрузите созданный файл document_status.json в CRM-систему

Структура папок должна быть такой:
DOCS_FOLDER/
├── А01/
│   ├── фото.jpg (или .png, .jpeg)
│   ├── паспорт.pdf (или .jpg, .png)
│   ├── прописка.pdf (или .jpg, .png)
│   └── загранпаспорт.pdf (или .jpg, .png)
├── А02/
│   ├── фото.jpg
│   └── паспорт.pdf
└── А03/
    └── ...
"""

import os
import json
from pathlib import Path
from datetime import datetime

# ====== НАСТРОЙКИ ======
# Путь к папке с документами (ИЗМЕНИТЕ НА СВОЙ ПУТЬ!)
DOCS_FOLDER = r"C:\Документы\Паломники"

# Имена файлов которые ищем (без расширения, регистр не важен)
# Можно указать несколько вариантов для каждого типа
DOCUMENT_TYPES = {
    'photo': ['фото', 'photo', 'фотография'],
    'passport': ['паспорт', 'passport'],
    'registration': ['прописка', 'registration'],
    'foreign_passport': ['загранпаспорт', 'загран', 'foreign_passport']
}

# Выходной файл
OUTPUT_FILE = "document_status.json"

# ====== ФУНКЦИИ ======

def find_file_in_folder(folder_path, file_names):
    """
    Ищет файл в папке по списку возможных имен (без учета расширения и регистра)
    Возвращает имя найденного файла или None
    """
    if not os.path.exists(folder_path):
        return None
    
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        if os.path.isfile(file_path):
            # Получаем имя файла без расширения и приводим к нижнему регистру
            file_name_without_ext = os.path.splitext(file)[0].lower()
            
            # Проверяем совпадение с любым из возможных имен
            for name_variant in file_names:
                if name_variant.lower() in file_name_without_ext:
                    return file
    
    return None


def scan_folder(folder_name, folder_path):
    """
    Сканирует одну папку паломника и проверяет наличие документов
    """
    result = {
        'folderNumber': folder_name,
        'documents': {
            'photo': False,
            'passport': False,
            'registration': False,
            'foreign_passport': False
        },
        'found_files': {},
        'missing_files': [],
        'status': 'incomplete'
    }
    
    # Проверяем каждый тип документа
    for doc_type, name_variants in DOCUMENT_TYPES.items():
        found_file = find_file_in_folder(folder_path, name_variants)
        
        if found_file:
            result['documents'][doc_type] = True
            result['found_files'][doc_type] = found_file
        else:
            result['missing_files'].append(doc_type)
    
    # Определяем общий статус
    if all(result['documents'].values()):
        result['status'] = 'complete'
    
    return result


def scan_all_folders():
    """
    Сканирует все папки в директории с документами
    """
    print(f"🔍 Сканирование папки: {DOCS_FOLDER}")
    print("=" * 60)
    
    if not os.path.exists(DOCS_FOLDER):
        print(f"❌ Ошибка: Папка не найдена: {DOCS_FOLDER}")
        print("💡 Укажите правильный путь в переменной DOCS_FOLDER")
        return None
    
    results = []
    total_complete = 0
    total_incomplete = 0
    
    # Перебираем все папки в директории
    for item in os.listdir(DOCS_FOLDER):
        item_path = os.path.join(DOCS_FOLDER, item)
        
        # Пропускаем файлы, только папки
        if not os.path.isdir(item_path):
            continue
        
        # Пропускаем скрытые папки
        if item.startswith('.'):
            continue
        
        print(f"\n📁 Папка: {item}")
        
        # Сканируем папку
        folder_result = scan_folder(item, item_path)
        results.append(folder_result)
        
        # Выводим результат
        if folder_result['status'] == 'complete':
            print(f"   ✅ Полный комплект документов")
            total_complete += 1
        else:
            print(f"   ⚠️  Неполный комплект")
            print(f"   ❌ Отсутствуют: {', '.join(folder_result['missing_files'])}")
            total_incomplete += 1
        
        # Показываем найденные файлы
        if folder_result['found_files']:
            print(f"   📄 Найдены:")
            for doc_type, filename in folder_result['found_files'].items():
                print(f"      • {doc_type}: {filename}")
    
    # Итоговая статистика
    print("\n" + "=" * 60)
    print(f"📊 ИТОГО:")
    print(f"   Всего папок: {len(results)}")
    print(f"   ✅ Полный комплект: {total_complete}")
    print(f"   ⚠️  Неполный комплект: {total_incomplete}")
    print("=" * 60)
    
    return results


def save_results(results):
    """
    Сохраняет результаты в JSON-файл
    """
    output_data = {
        'scan_date': datetime.now().isoformat(),
        'docs_folder': DOCS_FOLDER,
        'total_folders': len(results),
        'results': results
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Результаты сохранены в файл: {OUTPUT_FILE}")
    print(f"📤 Теперь загрузите этот файл в CRM-систему:")
    print(f"   1. Откройте CRM в браузере")
    print(f"   2. Перейдите в раздел 'Паломники'")
    print(f"   3. Нажмите кнопку 'Импорт статусов документов'")
    print(f"   4. Выберите файл {OUTPUT_FILE}")


def main():
    """
    Главная функция
    """
    print("\n" + "=" * 60)
    print("🕌 Сканер документов паломников")
    print("=" * 60)
    
    # Сканируем папки
    results = scan_all_folders()
    
    if results is None:
        return
    
    if len(results) == 0:
        print("\n⚠️  Папки не найдены!")
        print("💡 Убедитесь что:")
        print(f"   1. Путь указан правильно: {DOCS_FOLDER}")
        print(f"   2. В папке есть подпапки с документами")
        print(f"   3. Папки называются как номера (А01, А02, П-001 и т.д.)")
        return
    
    # Сохраняем результаты
    save_results(results)
    
    print("\n✅ Готово!")
    print("\n💡 Подсказка:")
    print("   Чтобы обновить статусы в CRM:")
    print(f"   1. Откройте файл {OUTPUT_FILE}")
    print("   2. Скопируйте содержимое")
    print("   3. В CRM нажмите 'Импорт статусов документов'")
    print("   4. Вставьте содержимое и нажмите 'Применить'")


if __name__ == "__main__":
    main()
    
    # Пауза чтобы окно не закрывалось сразу
    print("\n\nНажмите Enter для выхода...")
    input()
