import React, { useState } from 'react';
import type { ReceiptTemplate, ReceiptField } from '../types';
import { DEFAULT_RECEIPT_TEMPLATE } from '../types';
import { formatCurrency } from '../store/database';
import { numberToWords } from '../utils/numberToWords';
import { Save, RotateCcw, Plus, Trash2, Eye, FileText } from 'lucide-react';

interface ReceiptTemplateEditorProps {
  template: ReceiptTemplate;
  onSave: (template: ReceiptTemplate) => void;
}

export default function ReceiptTemplateEditor({ template, onSave }: ReceiptTemplateEditorProps) {
  const [currentTemplate, setCurrentTemplate] = useState<ReceiptTemplate>(template);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => {
    onSave(currentTemplate);
  };

  const handleReset = () => {
    if (confirm('Сбросить шаблон к стандартному? Все изменения будут потеряны.')) {
      setCurrentTemplate(DEFAULT_RECEIPT_TEMPLATE);
    }
  };

  const addField = () => {
    const newField: ReceiptField = {
      id: `field_${Date.now()}`,
      label: 'Новое поле',
      value: '',
      isAmount: false,
      isLarge: false
    };
    setCurrentTemplate({
      ...currentTemplate,
      fields: [...currentTemplate.fields, newField]
    });
  };

  const updateField = (index: number, updates: Partial<ReceiptField>) => {
    const newFields = [...currentTemplate.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setCurrentTemplate({ ...currentTemplate, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = currentTemplate.fields.filter((_, i) => i !== index);
    setCurrentTemplate({ ...currentTemplate, fields: newFields });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...currentTemplate.fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newFields.length) return;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setCurrentTemplate({ ...currentTemplate, fields: newFields });
  };

  // Предпросмотр квитанции
  const previewData = {
    number: 'КВ-000001',
    day: '15',
    month: '01',
    year: '2024',
    pilgrimName: 'Иванов Иван Иванович',
    amount: '250 000',
    amountWords: numberToWords(250000),
    employee: 'Иванова Мария Петровна'
  };

  const replaceVariables = (text: string): string => {
    return text
      .replace(/\{\{number\}\}/g, previewData.number)
      .replace(/\{\{day\}\}/g, previewData.day)
      .replace(/\{\{month\}\}/g, previewData.month)
      .replace(/\{\{year\}\}/g, previewData.year)
      .replace(/\{\{pilgrimName\}\}/g, previewData.pilgrimName)
      .replace(/\{\{amount\}\}/g, previewData.amount)
      .replace(/\{\{amountWords\}\}/g, previewData.amountWords)
      .replace(/\{\{employee\}\}/g, previewData.employee);
  };

  return (
    <div className="space-y-4">
      {/* Кнопки управления */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700"
        >
          <Save className="w-4 h-4" /> Сохранить шаблон
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
        >
          <RotateCcw className="w-4 h-4" /> Сбросить
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
        >
          <Eye className="w-4 h-4" /> {showPreview ? 'Скрыть' : 'Показать'} предпросмотр
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Редактор */}
        <div className="space-y-4">
          {/* Основные настройки */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Основные настройки
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Название шаблона</label>
                <input
                  type="text"
                  value={currentTemplate.name}
                  onChange={e => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Заголовок квитанции</label>
                <input
                  type="text"
                  value={currentTemplate.title}
                  onChange={e => setCurrentTemplate({ ...currentTemplate, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Количество копий на листе</label>
                <select
                  value={currentTemplate.copies}
                  onChange={e => setCurrentTemplate({ ...currentTemplate, copies: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value={1}>1 копия (весь лист)</option>
                  <option value={2}>2 копии (половина листа)</option>
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentTemplate.showStamp}
                    onChange={e => setCurrentTemplate({ ...currentTemplate, showStamp: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Показывать место для печати</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentTemplate.showSignature}
                    onChange={e => setCurrentTemplate({ ...currentTemplate, showSignature: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Показывать подпись</span>
                </label>
              </div>
            </div>
          </div>

          {/* Шапка */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="font-semibold text-gray-700 mb-3">Шапка квитанции</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Левая часть (можно оставить пустым)</label>
                <input
                  type="text"
                  value={currentTemplate.headerLeft}
                  onChange={e => setCurrentTemplate({ ...currentTemplate, headerLeft: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Например: {{companyName}}"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Правая часть (номер и дата)</label>
                <textarea
                  value={currentTemplate.headerRight}
                  onChange={e => setCurrentTemplate({ ...currentTemplate, headerRight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Доступные переменные: {'{{number}}'}, {'{{day}}'}, {'{{month}}'}, {'{{year}}'}
                </p>
              </div>
            </div>
          </div>

          {/* Поля */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-700">Поля квитанции</h4>
              <button
                onClick={addField}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-blue-700"
              >
                <Plus className="w-3 h-3" /> Добавить поле
              </button>
            </div>
            <div className="space-y-3">
              {currentTemplate.fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Поле #{index + 1}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                        title="Вверх"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveField(index, 'down')}
                        disabled={index === currentTemplate.fields.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                        title="Вниз"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeField(index)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                        title="Удалить"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Название поля</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={e => updateField(index, { label: e.target.value })}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Значение (можно использовать переменные)</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => updateField(index, { value: e.target.value })}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        placeholder="Например: {{pilgrimName}}"
                      />
                    </div>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={field.isAmount || false}
                          onChange={e => updateField(index, { isAmount: e.target.checked })}
                          className="rounded"
                        />
                        Крупная сумма
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={field.isLarge || false}
                          onChange={e => updateField(index, { isLarge: e.target.checked })}
                          className="rounded"
                        />
                        Большое поле
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p className="font-medium mb-1">Доступные переменные:</p>
              <ul className="space-y-0.5">
                <li><code>{'{{number}}'}</code> - номер квитанции</li>
                <li><code>{'{{day}}'}</code>, <code>{'{{month}}'}</code>, <code>{'{{year}}'}</code> - дата</li>
                <li><code>{'{{pilgrimName}}'}</code> - ФИО паломника</li>
                <li><code>{'{{amount}}'}</code> - сумма цифрами</li>
                <li><code>{'{{amountWords}}'}</code> - сумма прописью</li>
                <li><code>{'{{employee}}'}</code> - ФИО сотрудника</li>
              </ul>
            </div>
          </div>

          {/* Подвал */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="font-semibold text-gray-700 mb-3">Подвал квитанции</h4>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Текст подвала</label>
              <input
                type="text"
                value={currentTemplate.footerText}
                onChange={e => setCurrentTemplate({ ...currentTemplate, footerText: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Предпросмотр */}
        {showPreview && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="bg-white rounded-xl border p-4">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" /> Предпросмотр
              </h4>
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
                {/* Заголовок */}
                <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold">{currentTemplate.title}</div>
                  </div>
                  <div className="text-right text-xs whitespace-pre-line">
                    {replaceVariables(currentTemplate.headerRight)}
                  </div>
                </div>

                {/* Поля */}
                <div className="space-y-3 mb-6">
                  {currentTemplate.fields.map(field => (
                    <div key={field.id}>
                      <div className="text-xs text-gray-600 mb-1">{field.label}</div>
                      <div className={`border-b border-black pb-1 ${field.isAmount ? 'text-base font-bold' : 'text-sm'} ${field.isLarge ? 'min-h-[24px]' : 'min-h-[18px]'}`}>
                        {replaceVariables(field.value)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Подвал */}
                <div className="mt-6">
                  <div className="text-xs text-gray-600 mb-1">{currentTemplate.footerText}</div>
                  <div className="border-b border-black pb-1 text-sm mb-3">
                    {replaceVariables('{{employee}}')}
                  </div>
                  
                  {currentTemplate.showSignature && currentTemplate.showStamp && (
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Подпись исполнителя:</div>
                        <div className="border-b border-black w-48 pb-1"></div>
                      </div>
                      {currentTemplate.showStamp && (
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">М.П.</div>
                          <div className="w-20 h-20 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center text-xs text-gray-400">
                            печать
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {currentTemplate.copies === 2 && (
                <div className="mt-4">
                  <div className="border-t-2 border-dashed border-gray-400 relative my-4">
                    <span className="absolute left-2 -top-3 text-lg">✂</span>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Линия отреза (вторая копия идентична)</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
