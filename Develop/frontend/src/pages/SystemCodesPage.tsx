/**
 * 系統代碼設定頁面
 * 系統代碼的 CRUD 管理
 * 特殊功能：支援 HTML 渲染、上下標顯示、依語系顯示中英文
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SystemCode,
  SystemCodeCreate,
  getSystemCodes,
  createSystemCode,
  updateSystemCode,
  deleteSystemCode
} from '../services/systemCodeService';
import { I18nField } from '../types';
import { getI18nValue } from '../utils/i18nHelper';
import { usePermission } from '../hooks/usePermission';
import { useSystem } from '../contexts/SystemContext';
import { useMessage } from '../contexts/MessageContext';
import { useFunctionName } from '../hooks/useFunctionName';
import { logView, logCreate, logRead, logUpdate, logDelete } from '../utils/userLogHelper';
import { validateSession } from '../utils/sessionValidator';
import FunctionPageHeader from '../components/FunctionPageHeader';
import '../styles/DataTable.css';

const SystemCodesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const { availableLanguages } = useSystem();
  const { showSuccess, showError, showApiError } = useMessage();
  const enabledLangs = availableLanguages.map(l => l.code);
  const pageTitle = useFunctionName('system_codes');
  const [codes, setCodes] = useState<SystemCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<SystemCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<SystemCode | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewMode, setIsViewMode] = useState(false);
  const hasInitialized = useRef(false);

  // 關鍵字搜尋
  const [keyword, setKeyword] = useState('');

  // 篩選欄位
  const [filters, setFilters] = useState({
    codeType: '',    // 代碼類別 (code_type identifier)
    code: '',        // 代碼編號
    codeName: ''     // 代碼名稱
  });

  // 排序
  const [sortField, setSortField] = useState<'id' | 'codeType' | 'order'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState<SystemCodeCreate>({
    code_type: '',
    code_type_name: { 'zh-TW': '', 'en': '' },
    code: '',
    code_name: { 'zh-TW': '', 'en': '' },
    order: 0,
    is_active: true,
    note1: '',
    note2: '',
    note3: '',
    note4: '',
    note5: ''
  });

  const loadCodes = async (searchKeyword?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = searchKeyword ? { search: searchKeyword } : undefined;
      const data = await getSystemCodes(params);
      setCodes(data);
      setFilteredCodes(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // 取得唯一的代碼類別選項 (用 code_type 識別碼做 key，顯示 code_type_name)
  const getUniqueCodeTypes = () => {
    const typeMap = new Map<string, I18nField>();
    codes.forEach(code => {
      if (!typeMap.has(code.code_type)) {
        typeMap.set(code.code_type, code.code_type_name);
      }
    });
    const result: { value: string; label: string }[] = [];
    typeMap.forEach((name, type) => {
      const displayName = getI18nValue(name, i18n.language);
      const label = displayName && displayName !== type
        ? `${displayName} (${type})`
        : type;
      result.push({ value: type, label });
    });
    return result.sort((a, b) => a.label.localeCompare(b.label));
  };

  // 取得唯一的 code_type 值 (供 datalist 使用)
  const getUniqueCodeTypeValues = () => {
    const types = new Set<string>();
    codes.forEach(code => {
      if (code.code_type) types.add(code.code_type);
    });
    return Array.from(types).sort();
  };

  // 當選擇/輸入 code_type 時，自動帶入對應的 code_type_name
  const handleCodeTypeChange = (codeType: string) => {
    const newFormData = { ...formData, code_type: codeType };

    if (codeType) {
      const matchingCode = codes.find(code => code.code_type === codeType);
      if (matchingCode && matchingCode.code_type_name) {
        newFormData.code_type_name = { ...matchingCode.code_type_name };
      }
    }

    setFormData(newFormData);
  };

  // 取得唯一的代碼編號選項
  const getUniqueCodes = () => {
    const codeSet = new Set<string>();
    codes.forEach(code => {
      codeSet.add(code.code);
    });
    return Array.from(codeSet).sort();
  };

  // 取得唯一的代碼名稱選項
  const getUniqueCodeNames = () => {
    const names = new Set<string>();
    codes.forEach(code => {
      const primary = getI18nValue(code.code_name, i18n.language);
      const otherLang = i18n.language === 'zh-TW' ? 'en' : 'zh-TW';
      const secondary = getI18nValue(code.code_name, otherLang);
      const label = secondary && primary !== secondary
        ? `${primary} (${secondary})`
        : primary;
      if (label) names.add(label);
    });
    return Array.from(names).sort();
  };

  // 套用篩選和排序
  useEffect(() => {
    let result = [...codes];

    // 篩選 - code_type 使用識別碼精確比對
    if (filters.codeType) {
      result = result.filter(code => code.code_type === filters.codeType);
    }
    if (filters.code) {
      result = result.filter(code => code.code === filters.code);
    }
    if (filters.codeName) {
      result = result.filter(code => {
        const primary = getI18nValue(code.code_name, i18n.language);
        const otherLang = i18n.language === 'zh-TW' ? 'en' : 'zh-TW';
        const secondary = getI18nValue(code.code_name, otherLang);
        const label = secondary && primary !== secondary
          ? `${primary} (${secondary})`
          : primary;
        return label === filters.codeName;
      });
    }

    // 排序
    result.sort((a, b) => {
      let compareValue = 0;
      if (sortField === 'id') {
        compareValue = a.id - b.id;
      } else if (sortField === 'codeType') {
        compareValue = a.code_type.localeCompare(b.code_type);
      } else if (sortField === 'order') {
        compareValue = a.order - b.order;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredCodes(result);
    setCurrentPage(1);
  }, [codes, filters, sortField, sortOrder]);

  useEffect(() => {
    if (!permissionLoading && hasPermission('system_codes', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;

      const initPage = async () => {
        try {
          // 驗證 session 有效性（檢查 token 並與後端驗證）
          const isValid = await validateSession('SystemCodesPage');
          if (!isValid) {
            return; // validateSession 會自動導向登入頁
          }

          // 載入資料（axios 攔截器會自動帶入 token 到 header，後端會驗證）
          await loadCodes();
          await logView('system_codes', undefined, undefined);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('system_codes', undefined, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading]);

  const handleReset = () => {
    setKeyword('');
    setFilters({
      codeType: '',
      code: '',
      codeName: ''
    });
    setSortField('id');
    setSortOrder('asc');
    setCurrentPage(1);
    loadCodes();
  };

  const handleSearch = () => {
    setFilters({ codeType: '', code: '', codeName: '' });
    setCurrentPage(1);
    loadCodes(keyword.trim() || undefined);
  };

  // 切換啟用狀態
  const handleToggleActive = async (code: SystemCode) => {
    if (!hasPermission('system_codes', 'update')) {
      showError('ERR020003', { action: 'toggle system code active' });
      return;
    }

    try {
      const updated = await updateSystemCode(code.id, { is_active: !code.is_active });
      await logUpdate('system_codes', code, updated);
      loadCodes();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.saveFailed');
      try {
        await logUpdate('system_codes', code, { is_active: !code.is_active }, errorMsg);
      } catch (logErr) {
        console.error('[SystemCodesPage] Failed to log error:', logErr);
      }
      showApiError(err);
    }
  };

  // 排序切換
  const handleSort = (field: 'id' | 'codeType' | 'order') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const openModal = (code?: SystemCode, viewMode: boolean = false) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code_type: code.code_type,
        code_type_name: { ...code.code_type_name },
        code: code.code,
        code_name: { ...code.code_name },
        order: code.order,
        is_active: code.is_active,
        note1: code.note1 || '',
        note2: code.note2 || '',
        note3: code.note3 || '',
        note4: code.note4 || '',
        note5: code.note5 || ''
      });
      setIsViewMode(viewMode);

      if (viewMode) {
        logRead('system_codes', code);
      }
    } else {
      setEditingCode(null);
      setFormData({
        code_type: '',
        code_type_name: { 'zh-TW': '', 'en': '' },
        code: '',
        code_name: { 'zh-TW': '', 'en': '' },
        order: 0,
        is_active: true,
        note1: '',
        note2: '',
        note3: '',
        note4: '',
        note5: ''
      });
      setIsViewMode(false);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCode(null);
    setIsViewMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCode) {
        const updated = await updateSystemCode(editingCode.id, formData);
        await logUpdate('system_codes', editingCode, updated);
        showSuccess('SYS020002', { name: pageTitle });
      } else {
        const created = await createSystemCode(formData);
        await logCreate('system_codes', created);
        showSuccess('SYS020001', { name: pageTitle });
      }
      closeModal();
      loadCodes();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || (editingCode ? t('message.saveFailed') : t('message.createFailed'));

      try {
        if (editingCode) {
          await logUpdate('system_codes', editingCode, formData, errorMsg);
        } else {
          await logCreate('system_codes', formData, errorMsg);
        }
      } catch (logErr) {
        console.error('[SystemCodesPage] Failed to log error:', logErr);
      }

      showApiError(err);
    }
  };

  const handleDelete = async (code: SystemCode) => {
    if (!window.confirm(t('message.deleteConfirm'))) {
      return;
    }

    try {
      await deleteSystemCode(code.id);
      await logDelete('system_codes', code);
      showSuccess('SYS020003', { name: pageTitle });
      loadCodes();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.deleteFailed');

      try {
        await logDelete('system_codes', code, errorMsg);
      } catch (logErr) {
        console.error('[SystemCodesPage] Failed to log error:', logErr);
      }

      showApiError(err);
    }
  };

  /**
   * 依照語系顯示代碼類別
   * 上方：當前選定語系名稱，下方：基礎語系(en)名稱
   */
  const renderCodeType = (code: SystemCode) => {
    const primary = getI18nValue(code.code_type_name, i18n.language);
    const base = code.code_type_name?.['en'] || '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span>{primary}</span>
        {base && base !== primary && (
          <span style={{ fontSize: '0.85em', color: '#666' }}>
            {base}
          </span>
        )}
      </div>
    );
  };

  /**
   * 依照語系顯示代碼名稱
   * 上方：當前選定語系名稱，下方：基礎語系(en)名稱
   */
  const renderCodeName = (code: SystemCode) => {
    const primary = getI18nValue(code.code_name, i18n.language);
    const base = code.code_name?.['en'] || '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span>{primary}</span>
        {base && base !== primary && (
          <span style={{ fontSize: '0.85em', color: '#666' }}>
            {base}
          </span>
        )}
      </div>
    );
  };

  // 更新 formData 中 I18nField 的某個語系值
  const updateI18nField = (fieldName: 'code_type_name' | 'code_name', lang: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [lang]: value
      }
    }));
  };

  // 檢查權限
  if (permissionLoading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!hasPermission('system_codes', 'read')) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </div>
      </div>
    );
  }

  // 計算分頁（使用篩選後的資料）
  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCodes = filteredCodes.slice(startIndex, endIndex);

  const canCreate = hasPermission('system_codes', 'create');
  const canUpdate = hasPermission('system_codes', 'update');
  const canDelete = hasPermission('system_codes', 'delete');

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="system_codes" />
        {canCreate && (
          <button className="btn-primary" onClick={() => openModal()}>
            {t('common.create')}
          </button>
        )}
      </div>

      {/* 篩選區域 */}
      <div className="search-bar" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 關鍵字搜尋列 */}
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center',
          padding: '10px 14px',
          background: '#f0f4f8', borderRadius: '6px', border: '1px solid #d0d7de'
        }}>
          <label style={{ fontWeight: '600', fontSize: '14px', color: '#24292f', whiteSpace: 'nowrap' }}>
            {t('systemCodes.searchKeyword', '關鍵字搜尋')}
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder={t('systemCodes.searchPlaceholder', '搜尋代碼類別、代碼編號、代碼名稱、說明...')}
            style={{ flex: 1, padding: '7px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
          />
          <button className="btn-primary" onClick={handleSearch} style={{ whiteSpace: 'nowrap', padding: '7px 16px' }}>
            {t('common.search')}
          </button>
          <button className="btn-secondary" onClick={handleReset} style={{ whiteSpace: 'nowrap', padding: '7px 16px' }}>
            {t('common.reset')}
          </button>
        </div>
        {/* 下拉篩選列 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '10px', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            {t('systemCodes.codeTypeCombined')}
          </label>
          <select
            value={filters.codeType}
            onChange={(e) => setFilters({ ...filters, codeType: e.target.value })}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">{t('common.all')}</option>
            {getUniqueCodeTypes().map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            {t('systemCodes.code')}
          </label>
          <select
            value={filters.code}
            onChange={(e) => setFilters({ ...filters, code: e.target.value })}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">{t('common.all')}</option>
            {getUniqueCodes().map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            {t('systemCodes.codeNameCombined')}
          </label>
          <select
            value={filters.codeName}
            onChange={(e) => setFilters({ ...filters, codeName: e.target.value })}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">{t('common.all')}</option>
            {getUniqueCodeNames().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead className="table-header-dark-green">
            <tr>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('id')}
                title="點擊排序"
              >
                ID {sortField === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('codeType')}
                title="點擊排序"
              >
                {t('systemCodes.codeType', '代碼類別識別碼')} {sortField === 'codeType' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th>{t('systemCodes.codeTypeCombined')}</th>
              <th>{t('systemCodes.code')}</th>
              <th>{t('systemCodes.codeNameCombined')}</th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('order')}
                title="點擊排序"
              >
                {t('systemCodes.order')} {sortField === 'order' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {currentCodes.map((code) => (
              <tr key={code.id}>
                <td>{code.id}</td>
                <td>{code.code_type}</td>
                <td>{renderCodeType(code)}</td>
                <td>{code.code}</td>
                <td>{renderCodeName(code)}</td>
                <td>{code.order}</td>
                <td>
                  <span
                    className={`status-badge ${code.is_active ? 'active' : 'inactive'}`}
                    style={{ cursor: canUpdate ? 'pointer' : 'default' }}
                    onClick={() => canUpdate && handleToggleActive(code)}
                    title={canUpdate ? '點擊切換啟用狀態' : ''}
                  >
                    {code.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="actions">
                  {canUpdate && (
                    <button className="btn-edit" onClick={() => openModal(code, false)} style={{ marginRight: '12px' }}>
                      {t('common.edit')}
                    </button>
                  )}
                  {!canUpdate && hasPermission('system_codes', 'read') && (
                    <button className="btn-secondary" onClick={() => openModal(code, true)} style={{ marginRight: '12px' }}>
                      {t('common.view')}
                    </button>
                  )}
                  {canDelete && (
                    <button className="btn-delete" onClick={() => handleDelete(code)}>
                      {t('common.delete')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCodes.length === 0 && (
          <div className="no-data">{t('message.noData')}</div>
        )}

        {filteredCodes.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              <label>
                {t('systemCodes.itemsPerPage')}：
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                {t('systemCodes.items')}
              </label>
              <span className="pagination-text">
                {t('systemCodes.totalRecords', {
                  total: filteredCodes.length,
                  current: currentPage,
                  totalPages: totalPages
                })}
              </span>
            </div>
            <div className="pagination-buttons">
              <button
                className="btn-pagination"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ⟪
              </button>
              <button
                className="btn-pagination"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              <button className={`btn-pagination active`}>
                {currentPage}
              </button>
              <button
                className="btn-pagination"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
              <button
                className="btn-pagination"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                ⟫
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 新增/編輯 Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                🔢 {pageTitle} - {isViewMode
                  ? t('common.viewOperation')
                  : editingCode
                  ? t('common.editOperation')
                  : t('common.createOperation')}
              </h2>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {/* 第一區：代碼類別 */}
                  <div className="form-group full-width">
                    <label>{t('systemCodes.codeType', '代碼類別識別碼')} *</label>
                    <input
                      type="text"
                      list="codetype-datalist"
                      value={formData.code_type}
                      onChange={(e) => handleCodeTypeChange(e.target.value)}
                      required
                      disabled={isViewMode}
                      maxLength={100}
                      placeholder={t('systemCodes.selectOrInput')}
                    />
                    <datalist id="codetype-datalist">
                      {getUniqueCodeTypeValues().map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  </div>
                  {enabledLangs.map((lang, idx) => (
                    <div className="form-group" key={`ctn-${lang}`}>
                      <label>{t('systemCodes.codeTypeName', '代碼類別名稱')} ({lang}){idx === 0 ? ' *' : ''}</label>
                      <input
                        type="text"
                        value={formData.code_type_name[lang] || ''}
                        onChange={(e) => updateI18nField('code_type_name', lang, e.target.value)}
                        required={idx === 0}
                        disabled={isViewMode}
                        maxLength={200}
                      />
                    </div>
                  ))}

                  {/* 第二區：代碼編號 + 次序 + 啟用 */}
                  <div className="form-group">
                    <label>{t('systemCodes.code')} *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      disabled={isViewMode}
                      maxLength={50}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('systemCodes.order')} *</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      required
                      disabled={isViewMode}
                    />
                  </div>

                  {/* 第三區：代碼名稱 */}
                  {enabledLangs.map((lang, idx) => (
                    <div className="form-group" key={`cn-${lang}`}>
                      <label>{t('systemCodes.codeName', '代碼名稱')} ({lang}){idx === 0 ? ' *' : ''}</label>
                      <input
                        type="text"
                        value={formData.code_name[lang] || ''}
                        onChange={(e) => updateI18nField('code_name', lang, e.target.value)}
                        required={idx === 0}
                        disabled={isViewMode}
                        maxLength={300}
                      />
                    </div>
                  ))}

                  {/* 第四區：說明 1~5 */}
                  <div className="form-group">
                    <label>{t('systemCodes.note1')}</label>
                    <input
                      type="text"
                      value={formData.note1}
                      onChange={(e) => setFormData({ ...formData, note1: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('systemCodes.note2')}</label>
                    <input
                      type="text"
                      value={formData.note2}
                      onChange={(e) => setFormData({ ...formData, note2: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('systemCodes.note3')}</label>
                    <input
                      type="text"
                      value={formData.note3}
                      onChange={(e) => setFormData({ ...formData, note3: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('systemCodes.note4')}</label>
                    <input
                      type="text"
                      value={formData.note4}
                      onChange={(e) => setFormData({ ...formData, note4: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('systemCodes.note5')}</label>
                    <input
                      type="text"
                      value={formData.note5}
                      onChange={(e) => setFormData({ ...formData, note5: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        disabled={isViewMode}
                      />
                      {t('common.active')}
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  {isViewMode ? t('common.close') : t('common.cancel')}
                </button>
                {!isViewMode && (
                  <button type="submit" className="btn-primary">
                    {editingCode ? t('common.save') : t('common.create')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemCodesPage;
