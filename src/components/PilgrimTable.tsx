import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Pilgrim, Leader, TableSettings, User } from '../types';
import {
  getPilgrimsForUser, updatePilgrim, getLeaders, getSession,
  archivePilgrim, deletePilgrim, getTableSettings, setTableSettings as saveTableSettings,
  getPilgrims, getArchivedPilgrims, restorePilgrim, formatCurrency, calculateAge, getPassportExpiryStatus,
  getSystemSettings
} from '../store/database';
import { formatPhone } from '../utils/phone';
import {
  Search, Filter, Plus, Archive, Trash2, Download, Columns,
  ChevronUp, ChevronDown, MoreVertical, Edit3, Eye, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Users, FileText, CreditCard, Upload
} from 'lucide-react';

interface PilgrimTableProps {
  user: User;
  onOpenCard: (id: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

const COLUMN_DEFS = [
  { key: 'folderNumber', label: 'Папка', width: 80, sortable: true },
  { key: 'fullName', label: 'ФИО', width: 280, sortable: true },
  { key: 'phone', label: 'Телефон', width: 140, sortable: false },
  { key: 'birthDate', label: 'Возраст', width: 100, sortable: true },
  { key: 'passportExpiry', label: 'Срок паспорта', width: 130, sortable: true },
  { key: 'leaderId', label: 'Руководитель', width: 160, sortable: true },
  { key: 'programType', label: 'Программа', width: 120, sortable: true },
  { key: 'totalAmount', label: 'Сумма', width: 120, sortable: true },
  { key: 'documentStatus', label: 'Документы', width: 110, sortable: true },
  { key: 'paymentStatus', label: 'Оплата', width: 100, sortable: true },
  { key: 'uploadStatus', label: 'Загрузка', width: 100, sortable: true },
  { key: 'comments', label: 'Комментарий', width: 200, sortable: false },
  { key: 'createdAt', label: 'Создан', width: 110, sortable: true },
];

export default function PilgrimTable({ user, onOpenCard, onCreateNew, onRefresh }: PilgrimTableProps) {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [search, setSearch] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState('');
  const [filterPayStatus, setFilterPayStatus] = useState('');
  const [filterUploadStatus, setFilterUploadStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<TableSettings>(getTableSettings());
  const [editingCell, setEditingCell] = useState<{ pilgrimId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    loadData();
  }, [showArchive]);

  const loadData = () => {
    if (showArchive) {
      setPilgrims(getArchivedPilgrims());
    } else {
      setPilgrims(getPilgrimsForUser());
    }
    setLeaders(getLeaders());
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

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

    if (settings.sortBy) {
      result.sort((a, b) => {
        let va: any, vb: any;
        if (settings.sortBy === 'fullName') {
          va = `${a.lastName} ${a.firstName} ${a.middleName}`.trim();
          vb = `${b.lastName} ${b.firstName} ${b.middleName}`.trim();
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
  }, [pilgrims, search, filterLeader, filterDocStatus, filterPayStatus, filterUploadStatus, settings, leaders]);

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
      if (editingCell.field === 'folderNumber' || editingCell.field === 'comments') {
        data[editingCell.field] = editValue;
      } else if (editingCell.field === 'phone') {
        data.phone = formatPhone(editValue);
      } else if (editingCell.field === 'totalAmount') {
        data.totalAmount = parseFloat(editValue) || 0;
      } else if (editingCell.field === 'leaderId') {
        data.leaderId = editValue;
      } else if (editingCell.field === 'uploadStatus') {
        data.uploadStatus = editValue as any;
      } else if (editingCell.field === 'programType') {
        const settings = getSystemSettings();
        data.programType = editValue as any;
        // Автоматически обновляем сумму при смене программы
        const newPrice = editValue === 'direct' ? settings.programDirect.price : settings.programEconomy.price;
        data.totalAmount = newPrice;
      }
      updatePilgrim(editingCell.pilgrimId, data);
      loadData();
      showNotification('success', 'Изменения сохранены');
    } catch (err: any) {
      showNotification('error', err.message || 'Ошибка сохранения');
    }
    setEditingCell(null);
  };

  const saveFullName = () => {
    if (!editFullName) return;
    try {
      updatePilgrim(editFullName.pilgrimId, {
        lastName: editFullName.lastName,
        firstName: editFullName.firstName,
        middleName: editFullName.middleName
      });
      loadData();
      showNotification('success', 'ФИО обновлено');
    } catch (err: any) {
      showNotification('error', err.message || 'Ошибка сохранения');
    }
    setEditFullName(null);
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

  const [bulkLeaderId, setBulkLeaderId] = useState('');
  const [bulkUploadStatus, setBulkUploadStatus] = useState('');
  const [showBulkLeader, setShowBulkLeader] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editFullName, setEditFullName] = useState<{ pilgrimId: string; lastName: string; firstName: string; middleName: string } | null>(null);

  const handleBulkAction = (action: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      if (action === 'archive') {
        ids.forEach(id => archivePilgrim(id));
        showNotification('success', `Архивировано: ${ids.length}`);
      } else if (action === 'delete') {
        if (confirm(`Удалить ${ids.length} записей? Это действие необратимо.`)) {
          ids.forEach(id => deletePilgrim(id));
          showNotification('success', `Удалено: ${ids.length}`);
        }
      } else if (action === 'change_leader') {
        setShowBulkLeader(true);
        setShowBulkMenu(false);
        return;
      } else if (action === 'change_upload') {
        setShowBulkUpload(true);
        setShowBulkMenu(false);
        return;
      }
      setSelected(new Set());
      loadData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
    setShowBulkMenu(false);
  };

  const applyBulkLeader = () => {
    if (!bulkLeaderId) return;
    const ids = Array.from(selected);
    try {
      ids.forEach(id => updatePilgrim(id, { leaderId: bulkLeaderId }));
      showNotification('success', `Руководитель изменён у ${ids.length} паломников`);
      setSelected(new Set());
      setShowBulkLeader(false);
      setBulkLeaderId('');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const applyBulkUpload = () => {
    const ids = Array.from(selected);
    try {
      ids.forEach(id => updatePilgrim(id, { uploadStatus: bulkUploadStatus as any }));
      showNotification('success', `Статус загрузки изменён у ${ids.length} паломников`);
      setSelected(new Set());
      setShowBulkUpload(false);
      setBulkUploadStatus('');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
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

  const renderCell = (pilgrim: Pilgrim, colKey: string) => {
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
      if (colKey === 'programType') {
        const settings = getSystemSettings();
        return (
          <select
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveCellEdit}
            onKeyDown={e => e.key === 'Enter' && saveCellEdit()}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
            autoFocus
          >
            <option value="direct">{settings.programDirect.name}</option>
            <option value="economy">{settings.programEconomy.name}</option>
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
          return fullName || '—';
        }
        case 'leaderId': return getLeaderName(value);
        case 'programType': {
          const settings = getSystemSettings();
          const program = value === 'direct' ? settings.programDirect : settings.programEconomy;
          const colors = value === 'direct' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
              {program.name}
            </span>
          );
        }
        case 'totalAmount': return value ? formatCurrency(value) : '—';
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
          const titles = {
            valid: `Действителен ещё ${status.daysLeft} дн.`,
            warning: `Истекает через ${status.daysLeft} дн.`,
            expired: `Просрочен на ${Math.abs(status.daysLeft)} дн.`,
            empty: ''
          };
          return (
            <div className={colors[status.status]} title={titles[status.status]}>
              {new Date(value).toLocaleDateString('ru-RU')}
              {status.status === 'warning' && <span className="ml-1 text-xs">⚠️</span>}
              {status.status === 'expired' && <span className="ml-1 text-xs">❌</span>}
            </div>
          );
        }
        default: return value || '—';
      }
    })();

    const editableFields = ['folderNumber', 'phone', 'totalAmount', 'leaderId', 'uploadStatus', 'programType', 'comments'];
    const isEditable = canEdit && (editableFields.includes(colKey) || colKey === 'fullName');

    return (
      <div
        className={`truncate text-sm ${isEditable ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''}`}
        onDoubleClick={() => {
          if (!canEdit) return;
          if (colKey === 'fullName') {
            setEditFullName({
              pilgrimId: pilgrim.id,
              lastName: pilgrim.lastName,
              firstName: pilgrim.firstName,
              middleName: pilgrim.middleName
            });
          } else if (editableFields.includes(colKey)) {
            handleCellEdit(pilgrim.id, colKey, colKey === 'leaderId' ? value : String(value || ''));
          }
        }}
        title={colKey === 'fullName' ? `${pilgrim.lastName} ${pilgrim.firstName} ${pilgrim.middleName}`.trim() : undefined}
      >
        {displayValue}
      </div>
    );
  };

  const visibleCols = COLUMN_DEFS.filter(c => settings.visibleColumns.includes(c.key));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.text}
        </div>
      )}

      {/* Toolbar */}
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
          {selected.size > 0 && (
            <div className="relative">
              <button onClick={() => setShowBulkMenu(!showBulkMenu)} className="px-2 md:px-3 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 hover:bg-blue-700">
                <MoreVertical className="w-4 h-4" /> <span className="hidden sm:inline">Действия ({selected.size})</span><span className="sm:hidden">{selected.size}</span>
              </button>
              {showBulkMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[180px]">
                  <button onClick={() => handleBulkAction('change_leader')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Сменить руководителя
                  </button>
                  <button onClick={() => handleBulkAction('change_upload')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Изменить статус загрузки
                  </button>
                  <button onClick={() => handleBulkAction('archive')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Archive className="w-4 h-4" /> Архивировать
                  </button>
                  <button onClick={() => handleBulkAction('delete')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Удалить
                  </button>
                </div>
              )}
            </div>
          )}
          <button 
            onClick={() => setShowArchive(!showArchive)} 
            className={`px-2 md:px-3 py-2 border rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 ${showArchive ? 'bg-amber-50 border-amber-300 text-amber-700' : 'hover:bg-gray-100'}`}
            title={showArchive ? 'Показать активных' : 'Показать архив'}
          >
            <Archive className="w-4 h-4" /> <span className="hidden sm:inline">{showArchive ? 'Архив' : 'Архив'}</span>
          </button>
          {!showArchive && (
            <button onClick={onCreateNew} className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 hover:bg-blue-700 shadow-sm">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Новый паломник</span><span className="sm:hidden">Новый</span>
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
              <option value="">Все руководители</option>
              {leaders.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
            </select>
            <select value={filterDocStatus} onChange={e => setFilterDocStatus(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
              <option value="">Все статусы документов</option>
              <option value="complete">Полный</option>
              <option value="incomplete">Неполный</option>
            </select>
            <select value={filterPayStatus} onChange={e => setFilterPayStatus(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
              <option value="">Все статусы оплаты</option>
              <option value="not_paid">Не оплачено</option>
              <option value="partial">Частично</option>
              <option value="paid">Оплачено</option>
              <option value="overpaid">Переплата</option>
            </select>
            <select value={filterUploadStatus} onChange={e => setFilterUploadStatus(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
              <option value="">Все статусы загрузки</option>
              <option value="">Пусто</option>
              <option value="reserve">Резерв</option>
              <option value="main">Основа</option>
            </select>
            {(filterLeader || filterDocStatus || filterPayStatus || filterUploadStatus) && (
              <button onClick={() => { setFilterLeader(''); setFilterDocStatus(''); setFilterPayStatus(''); setFilterUploadStatus(''); }} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        {/* Column picker */}
        {showColumnPicker && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {COLUMN_DEFS.map(col => (
              <label key={col.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.visibleColumns.includes(col.key)}
                  onChange={e => {
                    const newSettings = { ...settings };
                    if (e.target.checked) newSettings.visibleColumns.push(col.key);
                    else newSettings.visibleColumns = newSettings.visibleColumns.filter(c => c !== col.key);
                    setSettings(newSettings);
                    saveTableSettings(newSettings);
                  }}
                  className="rounded"
                />
                {col.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-500 flex items-center gap-4">
        <span>Всего: {pilgrims.length}</span>
        <span>Показано: {filteredPilgrims.length}</span>
        {selected.size > 0 && <span>Выбрано: {selected.size}</span>}
        <span className="ml-auto text-gray-400">Двойной клик по ячейке для редактирования</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th className="w-10 px-2 py-2 border-b border-r sticky left-0 bg-gray-100 z-20">
                <input type="checkbox" checked={selected.size === filteredPilgrims.length && filteredPilgrims.length > 0} onChange={toggleSelectAll} className="rounded" />
              </th>
              {visibleCols.map(col => (
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
              <th className="w-20 px-2 py-2 border-b text-center text-xs font-semibold text-gray-600 sticky right-0 bg-gray-100 z-20">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredPilgrims.map((pilgrim, idx) => (
              <tr key={pilgrim.id} className={`border-b hover:bg-blue-50/50 transition ${selected.has(pilgrim.id) ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-2 py-1.5 border-r text-center sticky left-0 bg-inherit z-10">
                  <input type="checkbox" checked={selected.has(pilgrim.id)} onChange={() => toggleSelect(pilgrim.id)} className="rounded" />
                </td>
                {visibleCols.map(col => (
                  <td key={col.key} className="px-3 py-1.5 border-r" style={{ width: col.width, minWidth: col.width }}>
                    {renderCell(pilgrim, col.key)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center sticky right-0 bg-inherit z-10">
                  <div className="flex items-center justify-center gap-1">
                    {showArchive ? (
                      <button 
                        onClick={() => { restorePilgrim(pilgrim.id); loadData(); showNotification('success', 'Паломник восстановлен'); }} 
                        className="p-1 hover:bg-emerald-100 rounded text-emerald-600" 
                        title="Восстановить"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => onOpenCard(pilgrim.id)} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="Открыть карточку">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPilgrims.length === 0 && (
              <tr>
                <td colSpan={visibleCols.length + 2} className="px-4 py-12 text-center text-gray-400">
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

      {/* Bulk change leader modal */}
      {showBulkLeader && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBulkLeader(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Сменить руководителя</h3>
            <p className="text-sm text-gray-500 mb-4">Выбранные паломники ({selected.size}): будет назначен новый руководитель</p>
            <select value={bulkLeaderId} onChange={e => setBulkLeaderId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-4">
              <option value="">— Выберите руководителя —</option>
              {leaders.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={applyBulkLeader} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Применить</button>
              <button onClick={() => setShowBulkLeader(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk change upload status modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBulkUpload(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Изменить статус загрузки</h3>
            <p className="text-sm text-gray-500 mb-4">Выбранные паломники ({selected.size}): будет установлен новый статус</p>
            <select value={bulkUploadStatus} onChange={e => setBulkUploadStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-4">
              <option value="">— Пусто —</option>
              <option value="reserve">Резерв</option>
              <option value="main">Основа</option>
            </select>
            <div className="flex gap-2">
              <button onClick={applyBulkUpload} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Применить</button>
              <button onClick={() => setShowBulkUpload(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit full name modal */}
      {editFullName && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditFullName(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Редактировать ФИО</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Фамилия *</label>
                <input
                  type="text"
                  value={editFullName.lastName}
                  onChange={e => setEditFullName({ ...editFullName, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Имя *</label>
                <input
                  type="text"
                  value={editFullName.firstName}
                  onChange={e => setEditFullName({ ...editFullName, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Отчество</label>
                <input
                  type="text"
                  value={editFullName.middleName}
                  onChange={e => setEditFullName({ ...editFullName, middleName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && saveFullName()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveFullName} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Сохранить</button>
              <button onClick={() => setEditFullName(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
