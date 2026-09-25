import React, { useState } from 'react';
import type { CustomColumn, CustomColumnType, TableSettings } from '../types';
import { getTableSettings, setTableSettings } from '../store/database';
import { Plus, Trash2, Edit3, ArrowUp, ArrowDown, Copy, X, Check, GripVertical, Eye, EyeOff } from 'lucide-react';

interface CustomColumnsManagerProps {
  onColumnsChange: () => void;
}

// Базовые колонки системы
const BASE_COLUMNS = [
  { key: 'folderNumber', label: 'Папка', type: 'text' as CustomColumnType, system: true },
  { key: 'fullName', label: 'ФИО', type: 'text' as CustomColumnType, system: true },
  { key: 'phone', label: 'Телефон', type: 'text' as CustomColumnType, system: true },
  { key: 'birthDate', label: 'Возраст', type: 'date' as CustomColumnType, system: true },
  { key: 'passportExpiry', label: 'Срок паспорта', type: 'date' as CustomColumnType, system: true },
  { key: 'leaderId', label: 'Руководитель', type: 'select' as CustomColumnType, system: true },
  { key: 'programType', label: 'Программа', type: 'select' as CustomColumnType, system: true },
  { key: 'tags', label: 'Теги', type: 'text' as CustomColumnType, system: true },
  { key: 'totalAmount', label: 'Сумма', type: 'number' as CustomColumnType, system: true },
  { key: 'hasPhoto', label: 'Фото', type: 'checkbox' as CustomColumnType, system: true },
  { key: 'hasPassport', label: 'Паспорт', type: 'checkbox' as CustomColumnType, system: true },
  { key: 'hasRegistration', label: 'Прописка', type: 'checkbox' as CustomColumnType, system: true },
  { key: 'hasForeignPassport', label: 'Загран', type: 'checkbox' as CustomColumnType, system: true },
  { key: 'documentStatus', label: 'Статус', type: 'select' as CustomColumnType, system: true },
  { key: 'paymentStatus', label: 'Оплата', type: 'select' as CustomColumnType, system: true },
  { key: 'uploadStatus', label: 'Загрузка', type: 'select' as CustomColumnType, system: true },
  { key: 'comments', label: 'Комментарий', type: 'text' as CustomColumnType, system: true },
  { key: 'createdAt', label: 'Создан', type: 'date' as CustomColumnType, system: true }
];

interface ColumnItem {
  key: string;
  label: string;
  type: CustomColumnType;
  system: boolean;
  width: number;
  options?: { id: string; label: string; color?: string }[];
}

export default function CustomColumnsManager({ onColumnsChange }: CustomColumnsManagerProps) {
  const [settings, setSettings] = useState<TableSettings>(getTableSettings());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColumn, setNewColumn] = useState<Partial<CustomColumn>>({
    name: '',
    type: 'text',
    options: []
  });
  const [editingColumn, setEditingColumn] = useState<ColumnItem | null>(null);
  const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);

  // Объединяем все колонки в один список
  const getAllColumns = (): ColumnItem[] => {
    const customColumns = (settings.customColumns || []).map(col => ({
      key: `custom_${col.id}`,
      label: col.name,
      type: col.type,
      system: false,
      width: col.width || 150,
      options: col.options
    }));

    // Базовые колонки с учётом кастомных названий и ширин
    const baseColumns = BASE_COLUMNS.map(col => ({
      key: col.key,
      label: settings.columnLabels?.[col.key] || col.label,
      type: col.type,
      system: true,
      width: settings.columnWidths?.[col.key] || 150
    }));

    // Объединяем в порядке из columnOrder
    const allColumnsMap = new Map<string, ColumnItem>();
    [...baseColumns, ...customColumns].forEach(col => {
      allColumnsMap.set(col.key, col);
    });

    // Порядок из настроек + новые колонки в конце
    const orderedKeys = settings.columnOrder || [];
    const result: ColumnItem[] = [];
    
    orderedKeys.forEach(key => {
      const col = allColumnsMap.get(key);
      if (col) result.push(col);
    });

    // Добавляем колонки которых нет в порядке
    allColumnsMap.forEach((col, key) => {
      if (!orderedKeys.includes(key)) {
        result.push(col);
      }
    });

    return result;
  };

  const allColumns = getAllColumns();

  const saveSettings = (newSettings: TableSettings) => {
    setTableSettings(newSettings);
    setSettings(newSettings);
    onColumnsChange();
  };

  // ====== ДОБАВЛЕНИЕ КОЛОНКИ ======
  const handleAddColumn = () => {
    if (!newColumn.name?.trim()) return;

    const column: CustomColumn = {
      id: 'custom_' + Date.now(),
      name: newColumn.name.trim(),
      type: newColumn.type || 'text',
      options: newColumn.type === 'select' ? (newColumn.options || []) : undefined,
      required: newColumn.required || false,
      defaultValue: newColumn.defaultValue,
      width: newColumn.width || 150,
      createdAt: new Date().toISOString()
    };

    const columnKey = `custom_${column.id}`;
    const updatedSettings = {
      ...settings,
      customColumns: [...(settings.customColumns || []), column],
      visibleColumns: [...(settings.visibleColumns || []), columnKey],
      columnOrder: [...(settings.columnOrder || []), columnKey]
    };

    saveSettings(updatedSettings);
    setNewColumn({ name: '', type: 'text', options: [] });
    setShowAddForm(false);
  };

  // ====== УДАЛЕНИЕ КОЛОНКИ ======
  const handleDeleteColumn = (key: string) => {
    const column = allColumns.find(c => c.key === key);
    if (!column || column.system) {
      alert('Системные колонки нельзя удалять');
      return;
    }

    if (!confirm(`Удалить колонку "${column.label}"? Данные будут потеряны.`)) return;

    const customId = key.replace('custom_', '');
    const updatedSettings = {
      ...settings,
      customColumns: (settings.customColumns || []).filter(c => c.id !== customId),
      visibleColumns: (settings.visibleColumns || []).filter(k => k !== key),
      columnOrder: (settings.columnOrder || []).filter(k => k !== key)
    };

    saveSettings(updatedSettings);
  };

  // ====== ПЕРЕМЕЩЕНИЕ КОЛОНКИ ======
  const handleMoveColumn = (key: string, direction: 'up' | 'down') => {
    const order = settings.columnOrder || [];
    const index = order.indexOf(key);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= order.length) return;

    const newOrder = [...order];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

    saveSettings({ ...settings, columnOrder: newOrder });
  };

  // ====== РЕДАКТИРОВАНИЕ КОЛОНКИ ======
  const handleSaveEdit = () => {
    if (!editingColumn) return;

    if (editingColumn.system) {
      // Редактируем системную колонку
      const newLabels = { ...settings.columnLabels };
      const newWidths = { ...settings.columnWidths };
      
      // Находим оригинальное название
      const baseCol = BASE_COLUMNS.find(c => c.key === editingColumn.key);
      if (baseCol && editingColumn.label !== baseCol.label) {
        newLabels[editingColumn.key] = editingColumn.label;
      } else {
        delete newLabels[editingColumn.key];
      }
      
      newWidths[editingColumn.key] = editingColumn.width;

      saveSettings({
        ...settings,
        columnLabels: newLabels,
        columnWidths: newWidths
      });
    } else {
      // Редактируем пользовательскую колонку
      const customId = editingColumn.key.replace('custom_', '');
      const updatedCustomColumns = (settings.customColumns || []).map(c => {
        if (c.id === customId) {
          return {
            ...c,
            name: editingColumn.label,
            type: editingColumn.type,
            width: editingColumn.width,
            options: editingColumn.options
          };
        }
        return c;
      });

      saveSettings({ ...settings, customColumns: updatedCustomColumns });
    }

    setEditingColumn(null);
  };

  // ====== ДУБЛИРОВАНИЕ КОЛОНКИ ======
  const handleDuplicateColumn = (column: ColumnItem) => {
    if (column.system) {
      alert('Системные колонки нельзя дублировать. Создайте новую пользовательскую колонку.');
      return;
    }

    const originalCustom = (settings.customColumns || []).find(c => c.id === column.key.replace('custom_', ''));
    if (!originalCustom) return;

    const newCol: CustomColumn = {
      ...originalCustom,
      id: 'custom_' + Date.now(),
      name: `${originalCustom.name} (копия)`,
      createdAt: new Date().toISOString()
    };

    const columnKey = `custom_${newCol.id}`;
    const currentIndex = (settings.columnOrder || []).indexOf(column.key);
    const newOrder = [...(settings.columnOrder || [])];
    newOrder.splice(currentIndex + 1, 0, columnKey);

    saveSettings({
      ...settings,
      customColumns: [...(settings.customColumns || []), newCol],
      visibleColumns: [...(settings.visibleColumns || []), columnKey],
      columnOrder: newOrder
    });
  };

  // ====== DRAG & DROP ======
  const handleDragStart = (key: string) => {
    setDraggedColumnKey(key);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumnKey || draggedColumnKey === targetKey) return;

    const order = [...(settings.columnOrder || [])];
    const draggedIndex = order.indexOf(draggedColumnKey);
    const targetIndex = order.indexOf(targetKey);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [dragged] = order.splice(draggedIndex, 1);
    order.splice(targetIndex, 0, dragged);

    setSettings({ ...settings, columnOrder: order });
    setDraggedColumnKey(targetKey);
  };

  const handleDragEnd = () => {
    if (draggedColumnKey) {
      saveSettings({ ...settings });
    }
    setDraggedColumnKey(null);
  };

  // ====== ВИДИМОСТЬ ======
  const toggleVisibility = (key: string) => {
    const isVisible = settings.visibleColumns.includes(key);
    const newVisible = isVisible
      ? settings.visibleColumns.filter(k => k !== key)
      : [...settings.visibleColumns, key];

    saveSettings({ ...settings, visibleColumns: newVisible });
  };

  const columnTypeLabels: Record<CustomColumnType, { label: string; icon: string }> = {
    text: { label: 'Текст', icon: '📝' },
    number: { label: 'Число', icon: '🔢' },
    date: { label: 'Дата', icon: '📅' },
    select: { label: 'Выбор', icon: '📋' },
    checkbox: { label: 'Флажок', icon: '☑️' },
    url: { label: 'Ссылка', icon: '🔗' },
    email: { label: 'Email', icon: '📧' }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-500" />
            Управление колонками
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Перетаскивайте колонки для изменения порядка • Все колонки можно редактировать
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Новая колонка
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-blue-900">Новая пользовательская колонка</h4>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Название</label>
            <input
              type="text"
              value={newColumn.name || ''}
              onChange={e => setNewColumn({ ...newColumn, name: e.target.value })}
              placeholder="Например: Номер визы"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Тип данных</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(columnTypeLabels).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setNewColumn({ ...newColumn, type: type as CustomColumnType })}
                  className={`p-2 border rounded-lg text-sm flex items-center gap-2 transition ${
                    newColumn.type === type
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {newColumn.type === 'select' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Варианты выбора</label>
              <div className="space-y-2">
                {(newColumn.options || []).map((option, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={option.label}
                      onChange={e => {
                        const options = [...(newColumn.options || [])];
                        options[idx] = { ...options[idx], label: e.target.value };
                        setNewColumn({ ...newColumn, options });
                      }}
                      placeholder="Вариант"
                      className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <input
                      type="color"
                      value={option.color || '#3B82F6'}
                      onChange={e => {
                        const options = [...(newColumn.options || [])];
                        options[idx] = { ...options[idx], color: e.target.value };
                        setNewColumn({ ...newColumn, options });
                      }}
                      className="w-10 h-9 rounded cursor-pointer"
                    />
                    <button
                      onClick={() => {
                        const options = (newColumn.options || []).filter((_, i) => i !== idx);
                        setNewColumn({ ...newColumn, options });
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const options = [...(newColumn.options || []), { id: Date.now().toString(), label: '', color: '#3B82F6' }];
                    setNewColumn({ ...newColumn, options });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Добавить вариант
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddColumn}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Создать
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewColumn({ name: '', type: 'text', options: [] });
              }}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список всех колонок */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <h4 className="font-medium text-sm text-gray-700">
            Все колонки ({allColumns.length})
          </h4>
          <span className="text-xs text-gray-500">
            Видимых: {settings.visibleColumns?.length || 0}
          </span>
        </div>

        {allColumns.map((column, index) => {
          const isVisible = settings.visibleColumns.includes(column.key);
          const typeInfo = columnTypeLabels[column.type];

          return (
            <div
              key={column.key}
              draggable
              onDragStart={() => handleDragStart(column.key)}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDragEnd={handleDragEnd}
              className={`bg-white border rounded-lg p-3 flex items-center gap-3 transition ${
                draggedColumnKey === column.key ? 'opacity-50 scale-95' : ''
              } ${!isVisible ? 'opacity-60' : ''}`}
            >
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-gray-400 cursor-move flex-shrink-0" />

              {/* Номер */}
              <span className="text-xs text-gray-400 w-6 flex-shrink-0">#{index + 1}</span>

              {/* Информация о колонке */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{column.label}</span>
                  {column.system && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      системная
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{typeInfo.icon} {typeInfo.label}</span>
                  <span>•</span>
                  <span>{column.width}px</span>
                  {column.type === 'select' && column.options && (
                    <>
                      <span>•</span>
                      <span>{column.options.length} вариантов</span>
                    </>
                  )}
                </div>
              </div>

              {/* Видимость */}
              <button
                onClick={() => toggleVisibility(column.key)}
                className={`p-1.5 rounded transition ${
                  isVisible ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={isVisible ? 'Скрыть' : 'Показать'}
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Управление */}
              <div className="flex gap-0.5">
                <button
                  onClick={() => handleMoveColumn(column.key, 'up')}
                  disabled={index === 0}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
                  title="Вверх"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveColumn(column.key, 'down')}
                  disabled={index === allColumns.length - 1}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
                  title="Вниз"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingColumn(column)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                  title="Редактировать"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {!column.system && (
                  <>
                    <button
                      onClick={() => handleDuplicateColumn(column)}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                      title="Дублировать"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(column.key)}
                      className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно редактирования */}
      {editingColumn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">
              Редактировать колонку "{editingColumn.label}"
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Название</label>
                <input
                  type="text"
                  value={editingColumn.label}
                  onChange={e => setEditingColumn({...editingColumn, label: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                {editingColumn.system && (
                  <p className="text-xs text-gray-500 mt-1">
                    Это системная колонка. Изменение названия не повлияет на данные.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Ширина (px)</label>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={editingColumn.width}
                  onChange={e => setEditingColumn({...editingColumn, width: parseInt(e.target.value) || 150})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Тип данных только для пользовательских колонок */}
              {!editingColumn.system && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Тип данных</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(columnTypeLabels).map(([type, info]) => (
                      <button
                        key={type}
                        onClick={() => setEditingColumn({...editingColumn, type: type as CustomColumnType})}
                        className={`p-2 border rounded-lg text-sm flex items-center gap-2 transition ${
                          editingColumn.type === type
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Варианты для select */}
              {editingColumn.type === 'select' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Варианты выбора</label>
                  <div className="space-y-2">
                    {(editingColumn.options || []).map((option, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={option.label}
                          onChange={e => {
                            const options = [...(editingColumn.options || [])];
                            options[idx] = { ...options[idx], label: e.target.value };
                            setEditingColumn({ ...editingColumn, options });
                          }}
                          className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                          placeholder="Вариант"
                        />
                        <input
                          type="color"
                          value={option.color || '#3B82F6'}
                          onChange={e => {
                            const options = [...(editingColumn.options || [])];
                            options[idx] = { ...options[idx], color: e.target.value };
                            setEditingColumn({ ...editingColumn, options });
                          }}
                          className="w-10 h-9 rounded cursor-pointer"
                        />
                        <button
                          onClick={() => {
                            const options = (editingColumn.options || []).filter((_, i) => i !== idx);
                            setEditingColumn({ ...editingColumn, options });
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const options = [...(editingColumn.options || []), { id: Date.now().toString(), label: '', color: '#3B82F6' }];
                        setEditingColumn({ ...editingColumn, options });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Добавить вариант
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Сохранить
                </button>
                <button
                  onClick={() => setEditingColumn(null)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Подсказки */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-medium mb-2">💡 Подсказки:</h4>
        <ul className="space-y-1 text-xs">
          <li>• <strong>Перетаскивайте</strong> колонки за иконку ⋮⋮ для изменения порядка</li>
          <li>• Используйте кнопки <strong>↑↓</strong> для точного перемещения</li>
          <li>• Нажмите <strong>👁</strong> чтобы скрыть/показать колонку в таблице</li>
          <li>• Нажмите <strong>✏️</strong> чтобы изменить название и ширину любой колонки</li>
          <li>• <strong>Системные колонки</strong> нельзя удалить, но можно переименовать и скрыть</li>
          <li>• <strong>Пользовательские колонки</strong> можно дублировать и удалять</li>
        </ul>
      </div>
    </div>
  );
}
