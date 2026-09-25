import React, { useState } from 'react';
import type { CustomColumn, CustomColumnType, TableSettings } from '../types';
import { getTableSettings, setTableSettings } from '../store/database';
import { Plus, Trash2, Edit3, ArrowUp, ArrowDown, Copy, X, Check, GripVertical, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotification } from './NotificationProvider';

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
  const { success, error: showError } = useNotification();
  const [settings, setSettings] = useState<TableSettings>(getTableSettings());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColumn, setNewColumn] = useState<Partial<CustomColumn>>({
    name: '',
    type: 'text',
    options: []
  });
  const [editingColumn, setEditingColumn] = useState<ColumnItem | null>(null);

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

    const baseColumns = BASE_COLUMNS.map(col => ({
      key: col.key,
      label: settings.columnLabels?.[col.key] || col.label,
      type: col.type,
      system: true,
      width: settings.columnWidths?.[col.key] || 150
    }));

    const allColumnsMap = new Map<string, ColumnItem>();
    [...baseColumns, ...customColumns].forEach(col => {
      allColumnsMap.set(col.key, col);
    });

    const orderedKeys = settings.columnOrder || [];
    const result: ColumnItem[] = [];
    
    orderedKeys.forEach(key => {
      const col = allColumnsMap.get(key);
      if (col) result.push(col);
    });

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
    if (!newColumn.name?.trim()) {
      showError('Введите название колонки');
      return;
    }

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
    success(`Колонка "${column.name}" создана`);
  };

  // ====== УДАЛЕНИЕ КОЛОНКИ ======
  const handleDeleteColumn = (key: string) => {
    const column = allColumns.find(c => c.key === key);
    if (!column) return;

    if (column.system) {
      showError('Системные колонки нельзя удалять. Можно только скрыть.');
      return;
    }

    if (!confirm(`Вы уверены что хотите удалить колонку "${column.label}"?\n\nВсе данные в этой колонке будут потеряны безвозвратно.`)) {
      return;
    }

    const customId = key.replace('custom_', '');
    const updatedSettings = {
      ...settings,
      customColumns: (settings.customColumns || []).filter(c => c.id !== customId),
      visibleColumns: (settings.visibleColumns || []).filter(k => k !== key),
      columnOrder: (settings.columnOrder || []).filter(k => k !== key)
    };

    saveSettings(updatedSettings);
    success(`Колонка "${column.label}" удалена`);
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
    success('Порядок колонок изменён');
  };

  // ====== РЕДАКТИРОВАНИЕ КОЛОНКИ ======
  const handleSaveEdit = () => {
    if (!editingColumn) return;

    if (editingColumn.system) {
      const newLabels = { ...settings.columnLabels };
      const newWidths = { ...settings.columnWidths };
      
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
      success(`Колонка "${editingColumn.label}" обновлена`);
    } else {
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
      success(`Колонка "${editingColumn.label}" обновлена`);
    }

    setEditingColumn(null);
  };

  // ====== ДУБЛИРОВАНИЕ КОЛОНКИ ======
  const handleDuplicateColumn = (column: ColumnItem) => {
    if (column.system) {
      showError('Системные колонки нельзя дублировать. Создайте новую пользовательскую колонку.');
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
    success(`Колонка "${column.label}" дублирована`);
  };

  // ====== ВИДИМОСТЬ ======
  const toggleVisibility = (key: string) => {
    const isVisible = settings.visibleColumns.includes(key);
    const newVisible = isVisible
      ? settings.visibleColumns.filter(k => k !== key)
      : [...settings.visibleColumns, key];

    saveSettings({ ...settings, visibleColumns: newVisible });
    const column = allColumns.find(c => c.key === key);
    success(`Колонка "${column?.label}" ${isVisible ? 'скрыта' : 'показана'}`);
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
    <div className="space-y-6">
      {/* Заголовок с инструкцией */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Как управлять колонками:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Редактировать</strong> (✏️) - изменить название, ширину, тип</li>
              <li>• <strong>Удалить</strong> (🗑️) - удалить пользовательскую колонку</li>
              <li>• <strong>Переместить</strong> (↑↓) - изменить порядок колонок</li>
              <li>• <strong>Скрыть/Показать</strong> (👁) - управление видимостью в таблице</li>
              <li>• <strong>Дублировать</strong> (📋) - создать копию колонки</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Кнопка добавления */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Управление колонками ({allColumns.length})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" /> Добавить колонку
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-blue-900 text-lg">Создать новую колонку</h4>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewColumn({ name: '', type: 'text', options: [] });
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название колонки <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newColumn.name || ''}
              onChange={e => setNewColumn({ ...newColumn, name: e.target.value })}
              placeholder="Например: Номер визы, Дата оплаты, Статус"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип данных</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(columnTypeLabels).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setNewColumn({ ...newColumn, type: type as CustomColumnType })}
                  className={`p-3 border-2 rounded-lg text-sm flex items-center gap-2 transition ${
                    newColumn.type === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {newColumn.type === 'select' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Варианты выбора <span className="text-xs text-gray-500">(для типа "Выбор")</span>
              </label>
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
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="color"
                      value={option.color || '#3B82F6'}
                      onChange={e => {
                        const options = [...(newColumn.options || [])];
                        options[idx] = { ...options[idx], color: e.target.value };
                        setNewColumn({ ...newColumn, options });
                      }}
                      className="w-12 h-10 rounded cursor-pointer border-2 border-gray-300"
                    />
                    <button
                      onClick={() => {
                        const options = (newColumn.options || []).filter((_, i) => i !== idx);
                        setNewColumn({ ...newColumn, options });
                      }}
                      className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg border-2 border-red-200"
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
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Добавить вариант
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddColumn}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> Создать колонку
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewColumn({ name: '', type: 'text', options: [] });
              }}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список всех колонок */}
      <div className="space-y-3">
        {allColumns.map((column, index) => {
          const isVisible = settings.visibleColumns.includes(column.key);
          const typeInfo = columnTypeLabels[column.type];

          return (
            <div
              key={column.key}
              className={`bg-white border-2 rounded-lg p-4 transition ${
                !isVisible ? 'opacity-60 border-gray-200' : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Drag handle */}
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move flex-shrink-0" />

                {/* Номер */}
                <span className="text-sm font-medium text-gray-400 w-8">#{index + 1}</span>

                {/* Информация о колонке */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{column.label}</span>
                    {column.system && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        системная
                      </span>
                    )}
                    {!isVisible && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        скрыта
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="text-base">{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </span>
                    <span>•</span>
                    <span>Ширина: {column.width}px</span>
                    {column.type === 'select' && column.options && (
                      <>
                        <span>•</span>
                        <span>{column.options.length} вариантов</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Кнопки управления */}
                <div className="flex items-center gap-1">
                  {/* Видимость */}
                  <button
                    onClick={() => toggleVisibility(column.key)}
                    className={`p-2 rounded-lg transition ${
                      isVisible 
                        ? 'text-blue-600 hover:bg-blue-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={isVisible ? 'Скрыть колонку' : 'Показать колонку'}
                  >
                    {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>

                  {/* Перемещение */}
                  <button
                    onClick={() => handleMoveColumn(column.key, 'up')}
                    disabled={index === 0}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Переместить вверх"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleMoveColumn(column.key, 'down')}
                    disabled={index === allColumns.length - 1}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Переместить вниз"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>

                  {/* Редактирование */}
                  <button
                    onClick={() => setEditingColumn(column)}
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                    title="Редактировать колонку"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>

                  {/* Дублирование и удаление только для пользовательских */}
                  {!column.system && (
                    <>
                      <button
                        onClick={() => handleDuplicateColumn(column)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Дублировать колонку"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteColumn(column.key)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        title="Удалить колонку"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно редактирования */}
      {editingColumn && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                Редактировать колонку
              </h3>
              <button
                onClick={() => setEditingColumn(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название колонки
                </label>
                <input
                  type="text"
                  value={editingColumn.label}
                  onChange={e => setEditingColumn({...editingColumn, label: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                />
                {editingColumn.system && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Это системная колонка. Изменение названия не повлияет на данные.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ширина колонки (px)
                </label>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={editingColumn.width}
                  onChange={e => setEditingColumn({...editingColumn, width: parseInt(e.target.value) || 150})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Рекомендуется: 100-200px</p>
              </div>

              {/* Тип данных только для пользовательских колонок */}
              {!editingColumn.system && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип данных
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(columnTypeLabels).map(([type, info]) => (
                      <button
                        key={type}
                        onClick={() => setEditingColumn({...editingColumn, type: type as CustomColumnType})}
                        className={`p-3 border-2 rounded-lg text-sm flex items-center gap-2 transition ${
                          editingColumn.type === type
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl">{info.icon}</span>
                        <span>{info.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Варианты для select */}
              {editingColumn.type === 'select' && !editingColumn.system && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Варианты выбора
                  </label>
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
                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
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
                          className="w-12 h-10 rounded cursor-pointer border-2 border-gray-300"
                        />
                        <button
                          onClick={() => {
                            const options = (editingColumn.options || []).filter((_, i) => i !== idx);
                            setEditingColumn({ ...editingColumn, options });
                          }}
                          className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg border-2 border-red-200"
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
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Добавить вариант
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> Сохранить изменения
                </button>
                <button
                  onClick={() => setEditingColumn(null)}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
