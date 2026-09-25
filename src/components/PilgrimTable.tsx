import React, { useState, useEffect, useMemo } from 'react';
import type { Pilgrim, Leader, TableSettings, User, CustomColumn } from '../types';
import {
  getPilgrimsForUser, updatePilgrim, getLeaders,
  archivePilgrim, deletePilgrim, getTableSettings, setTableSettings as saveTableSettings,
  getArchivedPilgrims, restorePilgrim, formatCurrency, calculateAge, getPassportExpiryStatus,
  getSystemSettings, getAvailableTags, getTagById
} from '../store/database';
import { formatPhone } from '../utils/phone';
import { exportPilgrimsListToPDF } from '../utils/pdfExport';
import {
  Search, Filter, Plus, Archive, Trash2, Download, Columns,
  ChevronUp, ChevronDown, MoreVertical, Eye, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Users, Upload,
  FolderSync, Tag as TagIcon, FileDown
} from 'lucide-react';

interface PilgrimTableProps {
  user: User;
  onOpenCard: (id: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export default function PilgrimTable({ user, onOpenCard, onCreateNew, onRefresh }: PilgrimTableProps) {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [search, setSearch] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState('');
  const [filterPayStatus, setFilterPayStatus] = useState('');
  const [filterUploadStatus, setFilterUploadStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterPhoto, setFilterPhoto] = useState<'all' | 'yes' | 'no'>('all');
  const [filterPassport, setFilterPassport] = useState<'all' | 'yes' | 'no'>('all');
  const [filterRegistration, setFilterRegistration] = useState<'all' | 'yes' | 'no'>('all');
  const [filterForeignPassport, setFilterForeignPassport] = useState<'all' | 'yes' | 'no'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPassportExpiryFrom, setFilterPassportExpiryFrom] = useState('');
  const [filterPassportExpiryTo, setFilterPassportExpiryTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<TableSettings>(getTableSettings());
  const [editingCell, setEditingCell] = useState<{ pilgrimId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showImportDocs, setShowImportDocs] = useState(false);
  const [importJsonData, setImportJsonData] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [showArchive]);

  const loadData = () => {
    let pilgrimsList;
    if (showArchive) {
      pilgrimsList = getArchivedPilgrims();
    } else {
      pilgrimsList = getPilgrimsForUser();
    }
    setPilgrims(pilgrimsList);
    setLeaders(getLeaders());
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  // Генерация колонок с учётом пользовательских
  const COLUMN_DEFS = useMemo(() => {
    const baseColumns = [
      { key: 'folderNumber', label: 'Папка', width: 80, sortable: true },
      { key: 'fullName', label: 'ФИО', width: 280, sortable: true },
      { key: 'phone', label: 'Телефон', width: 140, sortable: false },
      { key: 'birthDate', label: 'Возраст', width: 100, sortable: true },
      { key: 'passportExpiry', label: 'Срок паспорта', width: 130, sortable: true },
      { key: 'leaderId', label: 'Руководитель', width: 160, sortable: true },
      { key: 'programType', label: 'Программа', width: 120, sortable: true },
      { key: 'tags', label: 'Теги', width: 180, sortable: false },
      { key: 'totalAmount', label: 'Сумма', width: 120, sortable: true },
      { key: 'hasPhoto', label: 'Фото', width: 70, sortable: false },
      { key: 'hasPassport', label: 'Паспорт', width: 80, sortable: false },
      { key: 'hasRegistration', label: 'Прописка', width: 85, sortable: false },
      { key: 'hasForeignPassport', label: 'Загран', width: 75, sortable: false },
      { key: 'documentStatus', label: 'Статус', width: 100, sortable: true },
      { key: 'paymentStatus', label: 'Оплата', width: 100, sortable: true },
      { key: 'uploadStatus', label: 'Загрузка', width: 100, sortable: true },
      { key: 'comments', label: 'Комментарий', width: 200, sortable: false },
      { key: 'createdAt', label: 'Создан', width: 110, sortable: true },
    ];

    // Добавляем пользовательские колонки
    const customColumns = (settings.customColumns || []).map(col => ({
      key: `custom_${col.id}`,
      label: col.name,
      width: col.width || 150,
      sortable: false,
      isCustom: true,
      customColumn: col
    }));

    return [...baseColumns, ...customColumns];
  }, [settings.customColumns]);

  const filteredPilgrims = useMemo(() => {
    let result = [...pilgrims];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        `${p.lastName} ${p.firstName} ${p.middleName}`.toLowerCase().includes(s) ||
        p.phone.includes(s) ||
        p.id.includes(s) ||
        p.folderNumber.toLowerCase().includes(s)
      );
    }
    if (filterLeader) result = result.filter(p => p.leaderId === filterLeader);
    if (filterDocStatus) result = result.filter(p => p.documentStatus === filterDocStatus);
    if (filterPayStatus) result = result.filter(p => p.paymentStatus === filterPayStatus);
    if (filterUploadStatus) result = result.filter(p => p.uploadStatus === filterUploadStatus);
    if (filterTag) result = result.filter(p => p.tags && p.tags.includes(filterTag));
    if (filterPhoto !== 'all') result = result.filter(p => filterPhoto === 'yes' ? p.hasPhoto : !p.hasPhoto);
    if (filterPassport !== 'all') result = result.filter(p => filterPassport === 'yes' ? p.hasPassport : !p.hasPassport);
    if (filterRegistration !== 'all') result = result.filter(p => filterRegistration === 'yes' ? p.hasRegistration : !p.hasRegistration);
    if (filterForeignPassport !== 'all') result = result.filter(p => filterForeignPassport === 'yes' ? p.hasForeignPassport : !p.hasForeignPassport);
    
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      result = result.filter(p => new Date(p.createdAt) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(p => new Date(p.createdAt) <= to);
    }
    if (filterPassportExpiryFrom) {
      const from = new Date(filterPassportExpiryFrom);
      result = result.filter(p => p.passportExpiry && new Date(p.passportExpiry) >= from);
    }
    if (filterPassportExpiryTo) {
      const to = new Date(filterPassportExpiryTo);
      result = result.filter(p => p.passportExpiry && new Date(p.passportExpiry) <= to);
    }

    if (settings.sortBy) {
      result.sort((a, b) => {
        let va: any, vb: any;
        if (settings.sortBy === 'fullName') {
          va = `${a.lastName} ${a.firstName} ${a.middleName}`.trim();
          vb = `${b.lastName} ${b.firstName} ${b.middleName}`.trim();
        } else if (settings.sortBy.startsWith('custom_')) {
          const colId = settings.sortBy.replace('custom_', '');
          va = a.customData?.[colId] || '';
          vb = b.customData?.[colId] || '';
        } else {
          va = (a as any)[settings.sortBy] || '';
          vb = (b as any)[settings.sortBy] || '';
        }
        if (settings.sortBy === 'leaderId') {
          const la = leaders.find(l => l.id === va);
          const lb = leaders.find(l => l.id === vb);
          va = la?.fullName || '';
          vb = lb?.fullName || '';
        }
        if (typeof va === 'number') return settings.sortOrder === 'asc' ? va - vb : vb - va;
        return settings.sortOrder === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return result;
  }, [pilgrims, search, filterLeader, filterDocStatus, filterPayStatus, filterUploadStatus, filterTag, filterPhoto, filterPassport, filterRegistration, filterForeignPassport, filterDateFrom, filterDateTo, filterPassportExpiryFrom, filterPassportExpiryTo, settings, leaders]);

  const handleSort = (key: string) => {
    const newSettings = { ...settings };
    if (newSettings.sortBy === key) {
      newSettings.sortOrder = newSettings.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      newSettings.sortBy = key;
      newSettings.sortOrder = 'asc';
    }
    setSettings(newSettings);
    saveTableSettings(newSettings);
  };

  const handleCellEdit = (pilgrimId: string, field: string, currentValue: string) => {
    setEditingCell({ pilgrimId, field });
    setEditValue(currentValue);
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    try {
      const pilgrim = pilgrims.find(p => p.id === editingCell.pilgrimId);
      if (!pilgrim) return;
      let data: any = {};
      
      // Обработка пользовательских колонок
      if (editingCell.field.startsWith('custom_')) {
        const colId = editingCell.field.replace('custom_', '');
        const customData = { ...(pilgrim.customData || {}) };
        customData[colId] = editValue;
        data.customData = customData;
      } else if (editingCell.field === 'folderNumber' || editingCell.field === 'comments') {
        data[editingCell.field] = editValue;
      } else if (editingCell.field === 'phone') {
        data.phone = formatPhone(editValue);
      } else if (editingCell.field === 'totalAmount') {
        data.totalAmount = parseFloat(editValue) || 0;
      } else if (editingCell.field === 'leaderId') {
        data.leaderId = editValue;
      } else if (editingCell.field === 'uploadStatus') {
        data.uploadStatus = editValue as any;
      }
      
      updatePilgrim(editingCell.pilgrimId, data);
      loadData();
      showNotification('success', 'Изменения сохранены');
    } catch (err: any) {
      showNotification('error', err.message || 'Ошибка сохранения');
    }
    setEditingCell(null);
  };

  const toggleSelect = (id: string) => {
    const newSel = new Set(selected);
    if (newSel.has(id)) newSel.delete(id); else newSel.add(id);
    setSelected(newSel);
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredPilgrims.length) setSelected(new Set());
    else setSelected(new Set(filteredPilgrims.map(p => p.id)));
  };

  const getLeaderName = (id: string) => leaders.find(l => l.id === id)?.fullName || '—';

  const renderStatusBadge = (type: string, value: string) => {
    const styles: Record<string, string> = {
      'complete': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'incomplete': 'bg-amber-100 text-amber-700 border-amber-200',
      'not_paid': 'bg-red-100 text-red-700 border-red-200',
      'partial': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'paid': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'overpaid': 'bg-blue-100 text-blue-700 border-blue-200',
      'reserve': 'bg-purple-100 text-purple-700 border-purple-200',
      'main': 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const labels: Record<string, string> = {
      'complete': 'Полный', 'incomplete': 'Неполный',
      'not_paid': 'Не оплачено', 'partial': 'Частично', 'paid': 'Оплачено', 'overpaid': 'Переплата',
      'reserve': 'Резерв', 'main': 'Основа',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[value] || 'bg-gray-100 text-gray-600'}`}>
        {labels[value] || value || '—'}
      </span>
    );
  };

  const renderCustomCell = (pilgrim: Pilgrim, column: CustomColumn) => {
    const value = pilgrim.customData?.[column.id];
    const isEditing = editingCell?.pilgrimId === pilgrim.id && editingCell?.field === `custom_${column.id}`;
    const canEdit = user.role === 'admin' || user.role === 'employee';

    if (isEditing) {
      if (column.type === 'select' && column.options) {
        return (
          <select
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveCellEdit}
            onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
            autoFocus
          >
            <option value="">—</option>
            {column.options.map(opt => (
              <option key={opt.id} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        );
      }
      if (column.type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={editValue === 'true'}
            onChange={e => {
              setEditValue(e.target.checked ? 'true' : 'false');
              saveCellEdit();
            }}
            onBlur={saveCellEdit}
            className="w-5 h-5 text-blue-600 rounded"
            autoFocus
          />
        );
      }
      if (column.type === 'date') {
        return (
          <input
            type="date"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveCellEdit}
            onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
            autoFocus
          />
        );
      }
      if (column.type === 'number') {
        return (
          <input
            type="number"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveCellEdit}
            onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
            autoFocus
          />
        );
      }
      return (
        <input
          type={column.type === 'email' ? 'email' : column.type === 'url' ? 'url' : 'text'}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={saveCellEdit}
          onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
          className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
          autoFocus
        />
      );
    }

    // Отображение значения
    let displayValue: any = '—';
    
    if (value !== undefined && value !== null && value !== '') {
      if (column.type === 'checkbox') {
        displayValue = value ? '✓' : '✗';
      } else if (column.type === 'date' && value) {
        displayValue = new Date(value).toLocaleDateString('ru-RU');
      } else if (column.type === 'url' && value) {
        displayValue = (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
            {value}
          </a>
        );
      } else if (column.type === 'email' && value) {
        displayValue = (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline truncate block">
            {value}
          </a>
        );
      } else if (column.type === 'select' && column.options) {
        const option = column.options.find(opt => opt.label === value);
        if (option?.color) {
          displayValue = (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: option.color }}
            >
              {value}
            </span>
          );
        } else {
          displayValue = value;
        }
      } else {
        displayValue = String(value);
      }
    }

    return (
      <div
        className={`truncate text-sm ${canEdit ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''}`}
        onDoubleClick={() => {
          if (canEdit) {
            handleCellEdit(pilgrim.id, `custom_${column.id}`, String(value || ''));
          }
        }}
        title={String(value || '')}
      >
        {displayValue}
      </div>
    );
  };

  const renderCell = (pilgrim: Pilgrim, colKey: string, colDef?: any) => {
    // Обработка пользовательских колонок
    if (colDef?.isCustom && colDef.customColumn) {
      return renderCustomCell(pilgrim, colDef.customColumn);
    }

    const isEditing = editingCell?.pilgrimId === pilgrim.id && editingCell?.field === colKey;
    const value = (pilgrim as any)[colKey];
    const canEdit = user.role === 'admin' || user.role === 'employee';

    if (isEditing) {
      if (colKey === 'leaderId') {
        return (
          <select
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveCellEdit}
            onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
            autoFocus
          >
            <option value="">—</option>
            {leaders.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
          </select>
        );
      }
      if (colKey === 'uploadStatus') {
        return (
          <select
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveCellEdit}
            onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
            autoFocus
          >
            <option value="">—</option>
            <option value="reserve">Резерв</option>
            <option value="main">Основа</option>
          </select>
        );
      }
      return (
        <input
          type={colKey === 'totalAmount' ? 'number' : 'text'}
          value={editValue}
          onChange={e => {
            if (colKey === 'phone') {
              setEditValue(formatPhone(e.target.value));
            } else {
              setEditValue(e.target.value);
            }
          }}
          onBlur={saveCellEdit}
          onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
          className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
          autoFocus
          placeholder={colKey === 'phone' ? '+7 (___) ___-__-__' : undefined}
        />
      );
    }

    const displayValue = (() => {
      switch (colKey) {
        case 'fullName': {
          const fullName = `${pilgrim.lastName} ${pilgrim.firstName} ${pilgrim.middleName}`.trim();
          return (
            <div 
              className="cursor-pointer hover:text-blue-600 hover:underline font-medium"
              onClick={() => onOpenCard(pilgrim.id)}
              title="Открыть карточку"
            >
              {fullName || '—'}
            </div>
          );
        }
        case 'leaderId': return getLeaderName(value);
        case 'programType': {
          const settings = getSystemSettings();
          const programType = value || 'direct';
          const program = programType === 'direct' ? settings.programDirect : settings.programEconomy;
          const colors = programType === 'direct' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
              {program?.name || 'Не указана'}
            </span>
          );
        }
        case 'tags': {
          const tags: string[] = pilgrim.tags || [];
          if (tags.length === 0) return <span className="text-gray-400">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map(tagId => {
                const tag = getTagById(tagId);
                if (!tag) return null;
                return (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                );
              })}
            </div>
          );
        }
        case 'totalAmount': return value ? formatCurrency(value) : '—';
        case 'hasPhoto':
        case 'hasPassport':
        case 'hasRegistration':
        case 'hasForeignPassport': {
          const isChecked = value === true;
          return (
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={e => {
                  if (canEdit) {
                    updatePilgrim(pilgrim.id, { [colKey]: e.target.checked } as any);
                    loadData();
                    showNotification('success', 'Документ обновлён');
                  }
                }}
                disabled={!canEdit}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          );
        }
        case 'documentStatus': return renderStatusBadge('doc', value);
        case 'paymentStatus': return renderStatusBadge('pay', value);
        case 'uploadStatus': return value ? renderStatusBadge('upload', value) : <span className="text-gray-400">—</span>;
        case 'createdAt': return new Date(value).toLocaleDateString('ru-RU');
        case 'birthDate': {
          if (!value) return '—';
          const age = calculateAge(value);
          return (
            <div title={new Date(value).toLocaleDateString('ru-RU')}>
              {age} <span className="text-gray-400 text-xs">лет</span>
            </div>
          );
        }
        case 'passportExpiry': {
          if (!value) return '—';
          const status = getPassportExpiryStatus(value);
          const colors = {
            valid: 'text-emerald-700',
            warning: 'text-amber-700',
            expired: 'text-red-700 font-semibold',
            empty: 'text-gray-400'
          };
          return (
            <div className={colors[status.status]} title={`Осталось ${status.daysLeft} дней`}>
              {new Date(value).toLocaleDateString('ru-RU')}
              {status.status === 'warning' && <span className="ml-1 text-xs">⚠️</span>}
              {status.status === 'expired' && <span className="ml-1 text-xs">❌</span>}
            </div>
          );
        }
        default: return value || '—';
      }
    })();

    const editableFields = ['folderNumber', 'phone', 'totalAmount', 'leaderId', 'uploadStatus', 'comments'];
    const isEditable = canEdit && (editableFields.includes(colKey) || colKey === 'fullName');

    return (
      <div
        className={`truncate text-sm ${isEditable && colKey !== 'fullName' ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''}`}
        onDoubleClick={() => {
          if (!canEdit) return;
          if (editableFields.includes(colKey)) {
            handleCellEdit(pilgrim.id, colKey, colKey === 'leaderId' ? value : String(value || ''));
          }
        }}
      >
        {displayValue}
      </div>
    );
  };

  const visibleCols = COLUMN_DEFS.filter((c: any) => settings.visibleColumns.includes(c.key));

  return (
    <div className="h-full flex flex-col bg-white">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.text}
        </div>
      )}

      <div className="border-b bg-gray-50 px-2 md:px-4 py-2 md:py-3 space-y-2 md:space-y-3">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[150px] md:min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`px-2 md:px-3 py-2 border rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-100'}`}>
            <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Фильтры</span>
          </button>
          <button onClick={() => setShowColumnPicker(!showColumnPicker)} className="px-2 md:px-3 py-2 border rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 hover:bg-gray-100">
            <Columns className="w-4 h-4" /> <span className="hidden sm:inline">Колонки</span>
          </button>
          <button onClick={() => { loadData(); showNotification('success', 'Данные обновлены'); }} className="px-2 md:px-3 py-2 border rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Обновить</span>
          </button>
          <div className="flex-1" />
          {!showArchive && (
            <button onClick={onCreateNew} className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 hover:bg-blue-700 shadow-sm">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Новый паломник</span><span className="sm:hidden">Новый</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-500 flex items-center gap-4">
        <span>Всего: {pilgrims.length}</span>
        <span>Показано: {filteredPilgrims.length}</span>
        {selected.size > 0 && <span>Выбрано: {selected.size}</span>}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th className="w-10 px-2 py-2 border-b border-r sticky left-0 bg-gray-100 z-20">
                <input type="checkbox" checked={selected.size === filteredPilgrims.length && filteredPilgrims.length > 0} onChange={toggleSelectAll} className="rounded" />
              </th>
              {visibleCols.map((col: any) => (
                <th
                  key={col.key}
                  className="px-3 py-2 border-b border-r text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none whitespace-nowrap"
                  style={{ width: col.width, minWidth: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && settings.sortBy === col.key && (
                      settings.sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPilgrims.map((pilgrim, idx) => (
              <tr key={pilgrim.id} className={`border-b hover:bg-blue-50/50 transition ${selected.has(pilgrim.id) ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-2 py-1.5 border-r text-center sticky left-0 bg-inherit z-10">
                  <input type="checkbox" checked={selected.has(pilgrim.id)} onChange={() => toggleSelect(pilgrim.id)} className="rounded" />
                </td>
                {visibleCols.map((col: any) => (
                  <td key={col.key} className="px-3 py-1.5 border-r" style={{ width: col.width, minWidth: col.width }}>
                    {renderCell(pilgrim, col.key, col)}
                  </td>
                ))}
              </tr>
            ))}
            {filteredPilgrims.length === 0 && (
              <tr>
                <td colSpan={visibleCols.length + 1} className="px-4 py-12 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg">Паломники не найдены</p>
                  <p className="text-sm mt-1">Попробуйте изменить параметры поиска или фильтры</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
