import React, { useState } from 'react';
import type { CustomColumn, CustomColumnType, TableSettings } from '../types';
import { getTableSettings, setTableSettings } from '../store/database';
import { Plus, Trash2, Edit3, ArrowUp, ArrowDown, Copy, X, Check, GripVertical } from 'lucide-react';

interface CustomColumnsManagerProps {
  onColumnsChange: () => void;
}

export default function CustomColumnsManager({ onColumnsChange }: CustomColumnsManagerProps) {
  const [settings, setSettings] = useState<TableSettings>(getTableSettings());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColumn, setNewColumn] = useState<Partial<CustomColumn>>({
    name: '',
    type: 'text',
    options: []
  });
  const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const customColumns = settings.customColumns || [];

  const refreshSettings = () => {
    setSettings(getTableSettings());
    onColumnsChange();
  };

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
      customColumns: [...customColumns, column],
      visibleColumns: [...(settings.visibleColumns || []), columnKey]
    };

    setTableSettings(updatedSettings);
    setSettings(updatedSettings);
    setNewColumn({ name: '', type: 'text', options: [] });
    setShowAddForm(false);
    onColumnsChange();
  };

  const handleDeleteColumn = (id: string) => {
    if (!confirm('Удалить эту колонку? Данные будут потеряны.')) return;

    const columnKey = `custom_${id}`;
    const updatedSettings = {
      ...settings,
      customColumns: customColumns.filter(c => c.id !== id),
      visibleColumns: (settings.visibleColumns || []).filter(key => key !== columnKey)
    };

    setTableSettings(updatedSettings);
    setSettings(updatedSettings);
    onColumnsChange();
  };

  const handleUpdateColumn = (id: string, updates: Partial<CustomColumn>) => {
    const updatedSettings = {
      ...settings,
      customColumns: customColumns.map(c => c.id === id ? { ...c, ...updates } : c)
    };

    setTableSettings(updatedSettings);
    setSettings(updatedSettings);
    setEditingColumn(null);
    onColumnsChange();
  };

  const handleMoveColumn = (id: string, direction: 'up' | 'down') => {
    const index = customColumns.findIndex(c => c.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customColumns.length) return;

    const newColumns = [...customColumns];
    [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];

    const updatedSettings = {
      ...settings,
      customColumns: newColumns
    };

    setTableSettings(updatedSettings);
    setSettings(updatedSettings);
    onColumnsChange();
  };

  const handleDuplicateColumn = (column: CustomColumn) => {
    const newCol: CustomColumn = {
      ...column,
      id: 'custom_' + Date.now(),
      name: `${column.name} (копия)`,
      createdAt: new Date().toISOString()
    };

    const columnKey = `custom_${newCol.id}`;
    const updatedSettings = {
      ...settings,
      customColumns: [...customColumns, newCol],
      visibleColumns: [...(settings.visibleColumns || []), columnKey]
    };

    setTableSettings(updatedSettings);
    setSettings(updatedSettings);
    onColumnsChange();
  };

  const handleDragStart = (id: string) => {
    setDraggedColumnId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetId) return;

    const draggedIndex = customColumns.findIndex(c => c.id === draggedColumnId);
    const targetIndex = customColumns.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newColumns = [...customColumns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);

    const updatedSettings = {
      ...settings,
      customColumns: newColumns
    };

    setTableSettings(updatedSettings);
    setSettings(updatedSettings);
    setDraggedColumnId(targetId);
  };

  const handleDragEnd = () => {
    setDraggedColumnId(null);
    onColumnsChange();
  };

  const columnTypes: { value: CustomColumnType; label: string; icon: string }[] = [
    { value: 'text', label: 'Текст', icon: '📝' },
    { value: 'number', label: 'Число', icon: '🔢' },
    { value: 'date', label: 'Дата', icon: '📅' },
    { value: 'select', label: 'Выбор', icon: '📋' },
    { value: 'checkbox', label: 'Флажок', icon: '☑️' },
    { value: 'url', label: 'Ссылка', icon: '🔗' },
    { value: 'email', label: 'Email', icon: '📧' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-blue-500" />
          Управление колонками
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Добавить колонку
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-blue-900">Новая колонка</h4>
          
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
              {columnTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setNewColumn({ ...newColumn, type: type.value })}
                  className={`p-2 border rounded-lg text-sm flex items-center gap-2 transition ${
                    newColumn.type === type.value
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
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
                    const options = [...(newColumn.options || []), { id: Date.now().toString(), label: '' }];
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
      <div className="space-y-4">
        {/* Системные колонки */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-2">Системные колонки</h4>
          <div className="space-y-2">
            {[
              { key: 'folderNumber', label: 'Папка', type: '📁 Текст' },
              { key: 'fullName', label: 'ФИО', type: '👤 Текст' },
              { key: 'phone', label: 'Телефон', type: '📞 Текст' },
              { key: 'birthDate', label: 'Возраст', type: '🎂 Дата' },
              { key: 'passportExpiry', label: 'Срок паспорта', type: '📅 Дата' },
              { key: 'leaderId', label: 'Руководитель', type: '👥 Выбор' },
              { key: 'programType', label: 'Программа', type: '📋 Выбор' },
              { key: 'tags', label: 'Теги', type: '🏷️ Текст' },
              { key: 'totalAmount', label: 'Сумма', type: '💰 Число' },
              { key: 'hasPhoto', label: 'Фото', type: '📷 Флажок' },
              { key: 'hasPassport', label: 'Паспорт', type: '📄 Флажок' },
              { key: 'hasRegistration', label: 'Прописка', type: '🏠 Флажок' },
              { key: 'hasForeignPassport', label: 'Загран', type: '✈️ Флажок' },
              { key: 'documentStatus', label: 'Статус', type: '✅ Выбор' },
              { key: 'paymentStatus', label: 'Оплата', type: '💳 Выбор' },
              { key: 'uploadStatus', label: 'Загрузка', type: '📤 Выбор' },
              { key: 'comments', label: 'Комментарий', type: '💬 Текст' },
              { key: 'createdAt', label: 'Создан', type: '📆 Дата' }
            ].map(col => (
              <div
                key={col.key}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-700">{col.label}</div>
                  <div className="text-xs text-gray-500">{col.type}</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.visibleColumns.includes(col.key)}
                    onChange={e => {
                      const newVisibleColumns = e.target.checked
                        ? [...settings.visibleColumns, col.key]
                        : settings.visibleColumns.filter((k: string) => k !== col.key);
                      const updatedSettings = { ...settings, visibleColumns: newVisibleColumns };
                      setSettings(updatedSettings);
                      setTableSettings(updatedSettings);
                      onColumnsChange();
                    }}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-600">Показывать</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Пользовательские колонки */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-2">Пользовательские колонки</h4>
          {customColumns.length === 0 ? (
            <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-sm">Пользовательские колонки не созданы</p>
              <p className="text-xs mt-1">Нажмите "Добавить колонку" выше</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customColumns.map((column, index) => (
                <div
                  key={column.id}
                  draggable
                  onDragStart={() => handleDragStart(column.id)}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white border rounded-lg p-3 flex items-center gap-3 cursor-move transition ${
                    draggedColumnId === column.id ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm">{column.name}</div>
                    <div className="text-xs text-gray-500">
                      {columnTypes.find(t => t.value === column.type)?.icon}{' '}
                      {columnTypes.find(t => t.value === column.type)?.label}
                      {column.type === 'select' && column.options && (
                        <span className="ml-2">({column.options.length} вариантов)</span>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mr-2">
                    <input
                      type="checkbox"
                      checked={settings.visibleColumns.includes(`custom_${column.id}`)}
                      onChange={e => {
                        const columnKey = `custom_${column.id}`;
                        const newVisibleColumns = e.target.checked
                          ? [...settings.visibleColumns, columnKey]
                          : settings.visibleColumns.filter((k: string) => k !== columnKey);
                        const updatedSettings = { ...settings, visibleColumns: newVisibleColumns };
                        setSettings(updatedSettings);
                        setTableSettings(updatedSettings);
                        onColumnsChange();
                      }}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-600">Показывать</span>
                  </label>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveColumn(column.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
                      title="Переместить вверх"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveColumn(column.id, 'down')}
                      disabled={index === customColumns.length - 1}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
                      title="Переместить вниз"
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
                    <button
                      onClick={() => handleDuplicateColumn(column)}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                      title="Дублировать"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно редактирования */}
      {editingColumn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Редактировать колонку</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Название</label>
                <input
                  type="text"
                  value={editingColumn.name}
                  onChange={e => setEditingColumn({...editingColumn, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Ширина (px)</label>
                <input
                  type="number"
                  value={editingColumn.width || 150}
                  onChange={e => setEditingColumn({...editingColumn, width: parseInt(e.target.value) || 150})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

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
                        const options = [...(editingColumn.options || []), { id: Date.now().toString(), label: '' }];
                        setEditingColumn({ ...editingColumn, options });
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
                  onClick={() => handleUpdateColumn(editingColumn.id, editingColumn)}
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
    </div>
  );
}
