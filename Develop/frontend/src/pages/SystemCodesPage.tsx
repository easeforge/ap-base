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
import { usePermission } from '../hooks/usePermission';
import { useFunctionName } from '../hooks/useFunctionName';
import { logView, logCreate, logRead, logUpdate, logDelete } from '../utils/userLogHelper';
import { validateSession } from '../utils/sessionValidator';
import FunctionPageHeader from '../components/FunctionPageHeader';
import '../styles/DataTable.css';

const SystemCodesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
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

  // 篩選欄位
  const [filters, setFilters] = useState({
    codeType: '',    // 代碼類別 (2,3)
    code: '',        // 代碼編號 (4)
    codeName: ''     // 代碼名稱 (5,6)
  });

  // 排序
  const [sortField, setSortField] = useState<'id' | 'codeType' | 'order'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState<SystemCodeCreate>({
    code_etype: '',
    code_ctype: '',
    code: '',
    code_cname: '',
    code_ename: '',
    order: 0,
    is_active: true,
    note1: '',
    note2: '',
    note3: '',
    note4: '',
    note5: ''
  });

  const loadCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemCodes();
      setCodes(data);
      setFilteredCodes(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // 取得唯一的代碼類別選項
  const getUniqueCodeTypes = () => {
    const types = new Set<string>();
    codes.forEach(code => {
      const isChinese = i18n.language === 'zh-TW';
      const label = isChinese
        ? `${code.code_ctype} (${code.code_etype})`
        : `${code.code_etype} (${code.code_ctype})`;
      types.add(label);
    });
    return Array.from(types).sort();
  };

  // 取得唯一的英文類別選項 (供 datalist 使用)
  const getUniqueEtypes = () => {
    const types = new Set<string>();
    codes.forEach(code => {
      if (code.code_etype) types.add(code.code_etype);
    });
    return Array.from(types).sort();
  };

  // 取得唯一的中文類別選項 (供 datalist 使用)
  const getUniqueCtypes = () => {
    const types = new Set<string>();
    codes.forEach(code => {
      if (code.code_ctype) types.add(code.code_ctype);
    });
    return Array.from(types).sort();
  };

  // 當選擇英文類別時,自動帶入對應的中文類別
  const handleEtypeChange = (etype: string) => {
    setFormData({ ...formData, code_etype: etype });

    // 查找該英文類別對應的中文類別
    if (etype) {
      const matchingCode = codes.find(code => code.code_etype === etype);
      if (matchingCode && matchingCode.code_ctype) {
        setFormData({ ...formData, code_etype: etype, code_ctype: matchingCode.code_ctype });
      }
    }
  };

  // 當選擇中文類別時,自動帶入對應的英文類別
  const handleCtypeChange = (ctype: string) => {
    setFormData({ ...formData, code_ctype: ctype });

    // 查找該中文類別對應的英文類別
    if (ctype) {
      const matchingCode = codes.find(code => code.code_ctype === ctype);
      if (matchingCode && matchingCode.code_etype) {
        setFormData({ ...formData, code_ctype: ctype, code_etype: matchingCode.code_etype });
      }
    }
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
      const isChinese = i18n.language === 'zh-TW';
      const primary = isChinese ? code.code_cname : (code.code_ename || code.code_cname);
      const secondary = isChinese ? code.code_ename : code.code_cname;
      const label = secondary && primary !== secondary
        ? `${primary} (${secondary})`
        : primary;
      names.add(label);
    });
    return Array.from(names).sort();
  };

  // 套用篩選和排序
  useEffect(() => {
    let result = [...codes];

    // 篩選 - 使用下拉選單的精確值
    if (filters.codeType) {
      result = result.filter(code => {
        const isChinese = i18n.language === 'zh-TW';
        const label = isChinese
          ? `${code.code_ctype} (${code.code_etype})`
          : `${code.code_etype} (${code.code_ctype})`;
        return label === filters.codeType;
      });
    }
    if (filters.code) {
      result = result.filter(code => code.code === filters.code);
    }
    if (filters.codeName) {
      result = result.filter(code => {
        const isChinese = i18n.language === 'zh-TW';
        const primary = isChinese ? code.code_cname : (code.code_ename || code.code_cname);
        const secondary = isChinese ? code.code_ename : code.code_cname;
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
        // 依代碼類別排序：先比較 code_etype，再比較 code_ctype
        compareValue = a.code_etype.localeCompare(b.code_etype);
        if (compareValue === 0) {
          compareValue = a.code_ctype.localeCompare(b.code_ctype);
        }
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
    setFilters({
      codeType: '',
      code: '',
      codeName: ''
    });
    setSortField('id');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  // 切換啟用狀態
  const handleToggleActive = async (code: SystemCode) => {
    if (!hasPermission('system_codes', 'update')) {
      alert(t('common.noUpdatePermission'));
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
      alert(errorMsg);
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
        code_etype: code.code_etype,
        code_ctype: code.code_ctype,
        code: code.code,
        code_cname: code.code_cname,
        code_ename: code.code_ename || '',
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
        code_etype: '',
        code_ctype: '',
        code: '',
        code_cname: '',
        code_ename: '',
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
        alert(t('message.saveSuccess'));
      } else {
        const created = await createSystemCode(formData);
        await logCreate('system_codes', created);
        alert(t('message.createSuccess'));
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

      alert(errorMsg);
    }
  };

  const handleDelete = async (code: SystemCode) => {
    if (!window.confirm(t('message.deleteConfirm'))) {
      return;
    }

    try {
      await deleteSystemCode(code.id);
      await logDelete('system_codes', code);
      alert(t('message.deleteSuccess'));
      loadCodes();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.deleteFailed');

      try {
        await logDelete('system_codes', code, errorMsg);
      } catch (logErr) {
        console.error('[SystemCodesPage] Failed to log error:', logErr);
      }

      alert(errorMsg);
    }
  };

  /**
   * 渲染 HTML 內容（支援上下標）
   * 安全處理：只允許 <sub> 和 <sup> 標籤
   */
  const renderHTML = (html: string) => {
    if (!html) return '';
    // 只允許 sub 和 sup 標籤，其他轉義
    const sanitized = html
      .replace(/<(?!\/?su[bp]>)/g, '&lt;')
      .replace(/(?<!<\/?su[bp])>/g, '&gt;');
    return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
  };

  /**
   * 依照語系顯示代碼類別
   * 中文語系：中文為主，英文換行縮小顯示於下方
   * 英文語系：只顯示英文
   */
  const renderCodeType = (code: SystemCode) => {
    const isChinese = i18n.language === 'zh-TW';

    if (isChinese) {
      // 中文語系：中文主要，英文副要（換行顯示）
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{renderHTML(code.code_ctype)}</span>
          {code.code_etype && (
            <span style={{ fontSize: '0.85em', color: '#666' }}>
              {renderHTML(code.code_etype)}
            </span>
          )}
        </div>
      );
    } else {
      // 英文語系：只顯示英文
      return renderHTML(code.code_etype);
    }
  };

  /**
   * 依照語系顯示代碼名稱
   * 中文語系：中文為主，英文換行縮小顯示於下方
   * 英文語系：只顯示英文（若無英文則顯示中文）
   */
  const renderCodeName = (code: SystemCode) => {
    const isChinese = i18n.language === 'zh-TW';

    if (isChinese) {
      // 中文語系：中文主要，英文副要（換行顯示）
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{renderHTML(code.code_cname)}</span>
          {code.code_ename && (
            <span style={{ fontSize: '0.85em', color: '#666' }}>
              {renderHTML(code.code_ename)}
            </span>
          )}
        </div>
      );
    } else {
      // 英文語系：只顯示英文（若無英文則顯示中文）
      return renderHTML(code.code_ename || code.code_cname);
    }
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

      {/* 篩選欄位 - 下拉選單 */}
      <div className="search-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '10px', alignItems: 'end' }}>
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
              <option key={type} value={type}>{type}</option>
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
        <button className="btn-secondary" onClick={handleReset} style={{ marginBottom: '0' }}>
          {t('common.reset')}
        </button>
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
                {t('systemCodes.codeTypeCombined')} {sortField === 'codeType' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
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
                <td>{renderCodeType(code)}</td>
                <td>{renderHTML(code.code)}</td>
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
                  <div className="form-group">
                    <label>{t('systemCodes.codeEtype')} *</label>
                    <input
                      type="text"
                      list="etype-datalist"
                      value={formData.code_etype}
                      onChange={(e) => handleEtypeChange(e.target.value)}
                      required
                      disabled={isViewMode}
                      maxLength={100}
                      placeholder={t('systemCodes.selectOrInput')}
                    />
                    <datalist id="etype-datalist">
                      {getUniqueEtypes().map((etype) => (
                        <option key={etype} value={etype} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>{t('systemCodes.codeCtype')} *</label>
                    <input
                      type="text"
                      list="ctype-datalist"
                      value={formData.code_ctype}
                      onChange={(e) => handleCtypeChange(e.target.value)}
                      required
                      disabled={isViewMode}
                      maxLength={200}
                      placeholder={t('systemCodes.selectOrInput')}
                    />
                    <datalist id="ctype-datalist">
                      {getUniqueCtypes().map((ctype) => (
                        <option key={ctype} value={ctype} />
                      ))}
                    </datalist>
                  </div>
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
                  <div className="form-group full-width">
                    <label>{t('systemCodes.codeCname')} *</label>
                    <input
                      type="text"
                      value={formData.code_cname}
                      onChange={(e) => setFormData({ ...formData, code_cname: e.target.value })}
                      required
                      disabled={isViewMode}
                      maxLength={300}
                      placeholder="支援 HTML 上下標: <sup>上標</sup> <sub>下標</sub>"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>{t('systemCodes.codeEname')}</label>
                    <input
                      type="text"
                      value={formData.code_ename}
                      onChange={(e) => setFormData({ ...formData, code_ename: e.target.value })}
                      disabled={isViewMode}
                      maxLength={300}
                      placeholder="支援 HTML 上下標: <sup>上標</sup> <sub>下標</sub>"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>{t('systemCodes.note1')}</label>
                    <input
                      type="text"
                      value={formData.note1}
                      onChange={(e) => setFormData({ ...formData, note1: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>{t('systemCodes.note2')}</label>
                    <input
                      type="text"
                      value={formData.note2}
                      onChange={(e) => setFormData({ ...formData, note2: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>{t('systemCodes.note3')}</label>
                    <input
                      type="text"
                      value={formData.note3}
                      onChange={(e) => setFormData({ ...formData, note3: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>{t('systemCodes.note4')}</label>
                    <input
                      type="text"
                      value={formData.note4}
                      onChange={(e) => setFormData({ ...formData, note4: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>{t('systemCodes.note5')}</label>
                    <input
                      type="text"
                      value={formData.note5}
                      onChange={(e) => setFormData({ ...formData, note5: e.target.value })}
                      disabled={isViewMode}
                      maxLength={500}
                    />
                  </div>
                  <div className="form-group full-width">
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
