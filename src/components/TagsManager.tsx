import React, { useState } from 'react';
import type { Tag } from '../types';
import { getAvailableTags, createTag, updateTag, deleteTag } from '../store/database';
import { Plus, Edit3, Trash2, Tag as TagIcon } from 'lucide-react';

interface TagsManagerProps {
  onTagsChange: () => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#475569', '#1E293B'
];

export default function TagsManager({ onTagsChange }: TagsManagerProps) {
  const [tags, setTags] = useState<Tag[]>(getAvailableTags());
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTag, setNewTag] = useState<{ name: string; color: string }>({ name: '', color: '#3B82F6' });
  const [showAddForm, setShowAddForm] = useState(false);

  const refreshTags = () => {
    setTags(getAvailableTags());
    onTagsChange();
  };

  const handleAdd = () => {
    if (!newTag.name.trim()) return;
    createTag(newTag.name.trim(), newTag.color);
    setNewTag({ name: '', color: '#3B82F6' });
    setShowAddForm(false);
    refreshTags();
  };

  const handleUpdate = () => {
    if (!editingTag || !editingTag.name.trim()) return;
    updateTag(editingTag.id, { name: editingTag.name.trim(), color: editingTag.color });
    setEditingTag(null);
    refreshTags();
  };

  const handleDelete = (id: string) => {
    if (confirm('Удалить тег?')) {
      deleteTag(id);
      refreshTags();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-blue-500" /> Теги паломников
        </h3>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Добавить тег
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-blue-900">Новый тег</h4>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Название</label>
            <input
              type="text"
              value={newTag.name}
              onChange={e => setNewTag({ ...newTag, name: e.target.value })}
              placeholder="Например: VIP, Срочно, Группа А"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewTag({ ...newTag, color })}
                  className={`w-8 h-8 rounded-lg border-2 transition ${newTag.color === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Создать</button>
            <button onClick={() => { setShowAddForm(false); setNewTag({ name: '', color: '#3B82F6' }); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Отмена</button>
          </div>
        </div>
      )}

      {editingTag && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-amber-900">Редактировать тег</h4>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Название</label>
            <input
              type="text"
              value={editingTag.name}
              onChange={e => setEditingTag({ ...editingTag, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleUpdate()}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditingTag({ ...editingTag, color })}
                  className={`w-8 h-8 rounded-lg border-2 transition ${editingTag.color === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpdate} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">Сохранить</button>
            <button onClick={() => setEditingTag(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Отмена</button>
          </div>
        </div>
      )}

      {tags.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <TagIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Теги пока не созданы</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white border"
              style={{ backgroundColor: tag.color, borderColor: tag.color }}
            >
              <span>{tag.name}</span>
              <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                <button onClick={() => setEditingTag({ ...tag })} className="p-0.5 hover:bg-white/20 rounded" title="Редактировать">
                  <Edit3 className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(tag.id)} className="p-0.5 hover:bg-white/20 rounded" title="Удалить">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
