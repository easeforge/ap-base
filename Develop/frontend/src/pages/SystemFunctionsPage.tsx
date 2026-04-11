/**
 * 系統功能設定頁面（正名化版本）
 * 系統功能的 CRUD 管理
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemFunction } from '../types/systemFunctions';
import { I18nField } from '../types';
import {
  SystemFunctionCreate,
  getSystemFunctions,
  createSystemFunction,
  updateSystemFunction,
  deleteSystemFunction
} from '../services/systemFunctionsService';
import { usePermission } from '../hooks/usePermission';
import { useFunctionName } from '../hooks/useFunctionName';
import { logView, logCreate, logRead, logUpdate, logDelete } from '../utils/userLogHelper';
import { getI18nValue } from '../utils/i18nHelper';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { validateSession } from '../utils/sessionValidator';
import '../styles/DataTable.css';

const SystemFunctionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const pageTitle = useFunctionName('system_functions');
  const hasInitialized = useRef(false);
  const [functions, setFunctions] = useState<SystemFunction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterUpperFunc, setFilterUpperFunc] = useState<number | ''>('');
  const [filterFuncType, setFilterFuncType] = useState<number | ''>('');
  const [showOnlyMana, setShowOnlyMana] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'func_order'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingFunction, setEditingFunction] = useState<SystemFunction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewMode, setIsViewMode] = useState(false);
  const [moduleItemActions, setModuleItemActions] = useState<string[]>([]);
  const [formData, setFormData] = useState<SystemFunctionCreate>({
    func_code: '',
    upper_func_id: 0,
    func_name: { 'zh-TW': '', 'en': '' } as I18nField,
    func_type: 2,
    func_order: 0,
    func_icon: '',
    module_code: '', // 正名化欄位
    module_item: [],
    description: '',
    is_mana: false,
    is_active: true
  });

  const loadFunctions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemFunctions({ search: search || undefined });
      setFunctions(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 等待權限載入完成後再檢查權限並載入資料
    if (!permissionLoading && hasPermission('system_functions', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          // 驗證 session 有效性（檢查 token 並與後端驗證）
          const isValid = await validateSession('SystemFunctionsPage');
          if (!isValid) {
            return; // validateSession 會自動導向登入頁
          }

          // 載入資料（axios 攔截器會自動帶入 token 到 header，後端會驗證）
          await loadFunctions();
          await logView('system_functions', { search: search || undefined }, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('system_functions', { search: search || undefined }, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadFunctions();
  };

  const handleSort = (field: 'id' | 'func_order') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredFunctions = functions.filter(func => {
    if (filterUpperFunc !== '' && func.upper_func_id !== filterUpperFunc) return false;
    if (filterFuncType !== '' && func.func_type !== filterFuncType) return false;
    if (showOnlyMana && !func.is_mana) return false;
    return true;
  });

  const sortedFunctions = [...filteredFunctions].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedFunctions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFunctions = sortedFunctions.slice(startIndex, startIndex + itemsPerPage);

  const handleCreate = () => {
    if (!hasPermission('system_functions', 'create')) {
      alert(t('message.noPermission'));
      return;
    }
    setEditingFunction(null);
    setIsViewMode(false);
    setFormData({
      func_code: '',
      upper_func_id: 0,
      func_name: { 'zh-TW': '', 'en': '' } as I18nField,
      func_type: 2,
      func_order: 0,
      func_icon: '',
      module_code: '', // 正名化欄位
      module_item: [],
      description: '',
      is_mana: false,
      is_active: true
    });
    setModuleItemActions([]);
    setShowModal(true);
  };

  const handleView = (func: SystemFunction) => {
    if (!hasPermission('system_functions', 'read')) {
      alert(t('message.noPermission'));
      return;
    }
    setEditingFunction(func);
    setIsViewMode(true);
    setFormData({
      func_code: func.func_code,
      upper_func_id: func.upper_func_id,
      func_name: func.func_name || { 'zh-TW': '', 'en': '' } as I18nField,
      func_type: func.func_type,
      func_order: func.func_order,
      func_icon: func.func_icon,
      module_code: func.module_code || '', // 正名化欄位
      module_item: func.module_item || [],
      description: func.description,
      is_mana: func.is_mana,
      is_active: func.is_active
    });
    setModuleItemActions(func.module_item || []);
    setShowModal(true);
    logRead('system_functions', func, func.id.toString());
  };

  const handleEdit = (func: SystemFunction) => {
    if (!hasPermission('system_functions', 'update')) {
      alert(t('message.noPermission'));
      return;
    }
    setEditingFunction(func);
    setIsViewMode(false);
    setFormData({
      func_code: func.func_code,
      upper_func_id: func.upper_func_id,
      func_name: func.func_name || { 'zh-TW': '', 'en': '' } as I18nField,
      func_type: func.func_type,
      func_order: func.func_order,
      func_icon: func.func_icon,
      module_code: func.module_code || '', // 正名化欄位
      module_item: func.module_item || [],
      description: func.description,
      is_mana: func.is_mana,
      is_active: func.is_active
    });
    setModuleItemActions(func.module_item || []);
    setShowModal(true);
  };

  const handleDelete = async (func: SystemFunction) => {
    if (!hasPermission('system_functions', 'delete')) {
      alert(t('message.noPermission'));
      return;
    }

    if (!window.confirm(t('common.confirmDelete'))) {
      return;
    }

    try {
      // v3.0 架構：直接呼叫刪除 API
      // axios 攔截器會自動從 localStorage 讀取 txn_token 並添加到 X-Txn-Token header
      // 後端會驗證 token 的有效性和 delete 權限

      // Debug: 檢查 localStorage 中的 token
      const txnToken = localStorage.getItem('txn_token');
      const accessToken = localStorage.getItem('access_token');
      console.log('[SystemFunctionsPage] Before delete:', {
        hasTxnToken: !!txnToken,
        txnTokenLength: txnToken?.length,
        hasAccessToken: !!accessToken,
        funcId: func.id
      });

      await deleteSystemFunction(func.id);
      await loadFunctions();
      alert(t('message.deleteSuccess'));

      // 日誌記錄（失敗不影響主要功能）
      try {
        await logDelete('system_functions', func);
      } catch (logErr) {
        console.error('[SystemFunctionsPage] Failed to log delete:', logErr);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.deleteFailed');
      alert(errorMsg);

      // 記錄失敗日誌（失敗也不影響）
      try {
        await logDelete('system_functions', func, errorMsg);
      } catch (logErr) {
        console.error('[SystemFunctionsPage] Failed to log error:', logErr);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證：當功能類型為「功能」時，必須輸入模組代碼且至少選擇一個權限項目
    if (formData.func_type === 2) {
      if (!formData.module_code || formData.module_code.trim() === '') {
        alert(t('sysFunctions.validation.moduleCodeRequired'));
        return;
      }
      if (moduleItemActions.length === 0) {
        alert(t('sysFunctions.validation.moduleItemRequired'));
        return;
      }
    }

    // 組合 module_item，並根據 func_type 處理 module_code
    const submitData = {
      ...formData,
      module_item: moduleItemActions,
      // 如果是節點類型 (func_type = 1)，則 module_code 必須為 undefined (後端會轉為 NULL)
      module_code: formData.func_type === 1 ? undefined : formData.module_code
    };

    try {
      if (editingFunction) {
        // 更新
        const updated = await updateSystemFunction(editingFunction.id, submitData);
        alert(t('message.updateSuccess'));

        // 日誌記錄（失敗不影響主要功能）
        try {
          await logUpdate('system_functions', editingFunction, updated);
        } catch (logErr) {
          console.error('[SystemFunctionsPage] Failed to log update:', logErr);
        }
      } else {
        // 新增
        const created = await createSystemFunction(submitData);
        alert(t('message.createSuccess'));

        // 日誌記錄（失敗不影響主要功能）
        try {
          await logCreate('system_functions', created);
        } catch (logErr) {
          console.error('[SystemFunctionsPage] Failed to log create:', logErr);
        }
      }
      setShowModal(false);
      await loadFunctions();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || (editingFunction ? t('message.updateFailed') : t('message.createFailed'));
      alert(errorMsg);

      // 記錄失敗日誌（失敗也不影響）
      try {
        if (editingFunction) {
          await logUpdate('system_functions', editingFunction, {}, errorMsg);
        } else {
          await logCreate('system_functions', {}, errorMsg);
        }
      } catch (logErr) {
        console.error('[SystemFunctionsPage] Failed to log error:', logErr);
      }
    }
  };

  const toggleModuleItem = (action: string) => {
    if (moduleItemActions.includes(action)) {
      setModuleItemActions(moduleItemActions.filter(a => a !== action));
    } else {
      setModuleItemActions([...moduleItemActions, action]);
    }
  };

  /**
   * 依照語系顯示功能名稱：
   * 中文語系→中文名稱在上，英文名稱在下
   * 英文語系→英文名稱在上，中文名稱在下
   */
  const renderFunctionName = (func: SystemFunction) => {
    const primary = getI18nValue(func.func_name, i18n.language);
    const secondaryLang = i18n.language === 'zh-TW' ? 'en' : 'zh-TW';
    const secondary = func.func_name?.[secondaryLang] || '';

    if (!secondary || primary === secondary) {
      return primary;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span>{primary}</span>
        <span style={{ fontSize: '0.85em', color: '#666' }}>
          {secondary}
        </span>
      </div>
    );
  };

  if (permissionLoading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!hasPermission('system_functions', 'read')) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  const canCreate = hasPermission('system_functions', 'create');

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="system_functions" />
        {canCreate && (
          <button className="btn-primary" onClick={handleCreate}>
            {t('common.create')}
          </button>
        )}
      </div>

      {/* 搜尋區 */}
      <div className="search-bar">
        <input
          type="text"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-secondary" onClick={handleSearch}>
          {t('common.search')}
        </button>
      </div>

      {/* 過濾區 */}
      <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filterUpperFunc}
          onChange={(e) => setFilterUpperFunc(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ padding: '0.5rem', minWidth: '200px' }}
        >
          <option value="">{t('sysFunctions.allUpperFunctions')}</option>
          <option value="0">{t('sysFunctions.rootLevel')}</option>
          {functions
            .filter(f => f.func_type === 1) // 只顯示節點類型
            .sort((a, b) => a.func_order - b.func_order)
            .map(func => (
              <option key={func.id} value={func.id}>
                {getI18nValue(func.func_name, i18n.language)} ({func.func_code})
              </option>
            ))}
        </select>

        <select
          value={filterFuncType}
          onChange={(e) => setFilterFuncType(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ padding: '0.5rem' }}
        >
          <option value="">{t('sysFunctions.allTypes')}</option>
          <option value="1">{t('sysFunctions.types.node')}</option>
          <option value="2">{t('sysFunctions.types.function')}</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={showOnlyMana}
            onChange={(e) => setShowOnlyMana(e.target.checked)}
          />
          {t('sysFunctions.showOnlyMana')}
        </label>
      </div>

      {/* 錯誤訊息 */}
      {error && <div className="error-message">{error}</div>}

      {/* 資料表格 */}
      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead className="table-header-dark-green">
                <tr>
                  <th onClick={() => handleSort('id')}>
                    ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>{t('sysFunctions.funcCode')}</th>
                  <th>{t('sysFunctions.funcName')}</th>
                  <th>{t('sysFunctions.funcType')}</th>
                  <th onClick={() => handleSort('func_order')}>
                    {t('sysFunctions.funcOrder')} {sortBy === 'func_order' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>{t('sysFunctions.moduleCode')}</th>
                  <th>{t('common.isActive')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFunctions.map((func) => (
                  <tr key={func.id}>
                    <td>{func.id}</td>
                    <td>{func.func_code}</td>
                    <td>{renderFunctionName(func)}</td>
                    <td>{func.func_type === 1 ? t('sysFunctions.types.node') : t('sysFunctions.types.function')}</td>
                    <td>{func.func_order}</td>
                    <td>{func.module_code || '-'}</td>
                    <td>{func.is_active ? t('common.yes') : t('common.no')}</td>
                    <td className="actions">
                      {hasPermission('system_functions', 'update') && (
                        <button className="btn-edit" onClick={() => handleEdit(func)} style={{ marginRight: '12px' }}>
                          {t('common.edit')}
                        </button>
                      )}
                      {!hasPermission('system_functions', 'update') && hasPermission('system_functions', 'read') && (
                        <button className="btn-secondary" onClick={() => handleView(func)} style={{ marginRight: '12px' }}>
                          {t('common.view')}
                        </button>
                      )}
                      {hasPermission('system_functions', 'delete') && (
                        <button className="btn-delete" onClick={() => handleDelete(func)}>
                          {t('common.delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分頁控制 */}
          <div className="pagination-container">
            <div className="pagination-info">
              <label>
                每頁顯示：
                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                筆
              </label>
              <span className="pagination-text">
                共 {sortedFunctions.length} 筆資料，第 {currentPage} / {totalPages} 頁
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
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹
              </button>

              <button
                className={`btn-pagination ${currentPage === 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>

              {currentPage > 3 && totalPages > 5 && (
                <span className="pagination-ellipsis">...</span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (page === 1 || page === totalPages) return false;
                  if (totalPages <= 5) return true;
                  if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                  return false;
                })
                .map(page => (
                  <button
                    key={page}
                    className={`btn-pagination ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

              {currentPage < totalPages - 2 && totalPages > 5 && (
                <span className="pagination-ellipsis">...</span>
              )}

              {totalPages > 1 && (
                <button
                  className={`btn-pagination ${currentPage === totalPages ? 'active' : ''}`}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </button>
              )}

              <button
                className="btn-pagination"
                onClick={() => setCurrentPage(currentPage + 1)}
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
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                ⚙️ {pageTitle} - {isViewMode
                  ? t('common.viewOperation')
                  : editingFunction
                  ? t('common.editOperation')
                  : t('common.createOperation')}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                <div className="form-group">
                  <label>{t('sysFunctions.funcCode')} *</label>
                  <input
                    type="text"
                    value={formData.func_code}
                    onChange={(e) => setFormData({ ...formData, func_code: e.target.value })}
                    disabled={isViewMode}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('sysFunctions.upperFuncId')}</label>
                  <select
                    value={formData.upper_func_id}
                    onChange={(e) => setFormData({ ...formData, upper_func_id: Number(e.target.value) })}
                    disabled={isViewMode}
                  >
                    <option value="0">{t('sysFunctions.rootLevel')}</option>
                    {functions
                      .filter(f => f.func_type === 1) // 只顯示節點類型
                      .sort((a, b) => a.func_order - b.func_order)
                      .map(func => (
                          <option key={func.id} value={func.id}>
                            {getI18nValue(func.func_name, i18n.language)} ({func.func_code})
                          </option>
                        ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('sysFunctions.funcCname')} *</label>
                  <input
                    type="text"
                    value={formData.func_name?.['zh-TW'] || ''}
                    onChange={(e) => setFormData({ ...formData, func_name: { ...formData.func_name, 'zh-TW': e.target.value } as I18nField })}
                    disabled={isViewMode}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('sysFunctions.funcEname')} *</label>
                  <input
                    type="text"
                    value={formData.func_name?.['en'] || ''}
                    onChange={(e) => setFormData({ ...formData, func_name: { ...formData.func_name, 'en': e.target.value } as I18nField })}
                    disabled={isViewMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('sysFunctions.funcType')} *</label>
                  <select
                    value={formData.func_type}
                    onChange={(e) => {
                      const newType = Number(e.target.value);
                      // 當切換為節點類型時，清空 module_code 和 module_item
                      if (newType === 1) {
                        setFormData({ ...formData, func_type: newType, module_code: '', module_item: [] });
                        setModuleItemActions([]);
                      } else {
                        setFormData({ ...formData, func_type: newType });
                      }
                    }}
                    disabled={isViewMode}
                    required
                  >
                    <option value="1">{t('sysFunctions.types.node')}</option>
                    <option value="2">{t('sysFunctions.types.function')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('sysFunctions.funcOrder')} *</label>
                  <input
                    type="number"
                    value={formData.func_order}
                    onChange={(e) => setFormData({ ...formData, func_order: Number(e.target.value) })}
                    disabled={isViewMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('sysFunctions.funcIcon')}</label>
                  <input
                    type="text"
                    value={formData.func_icon || ''}
                    onChange={(e) => setFormData({ ...formData, func_icon: e.target.value })}
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>
                    {t('sysFunctions.moduleCode')}
                    {formData.func_type === 2 && ' *'}
                  </label>
                  <input
                    type="text"
                    value={formData.module_code || ''}
                    onChange={(e) => setFormData({ ...formData, module_code: e.target.value })}
                    disabled={isViewMode || formData.func_type === 1}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>{t('sysFunctions.description')}</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isViewMode}
                    rows={3}
                  />
                </div>

                {formData.func_type === 2 && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ marginBottom: '8px', display: 'block' }}>
                      {t('sysFunctions.moduleItem')} *
                    </label>
                    <div className="checkbox-group">
                      {['Create', 'Read', 'Update', 'Delete', 'Print', 'File'].map(action => (
                        <label key={action}>
                          <input
                            type="checkbox"
                            checked={moduleItemActions.includes(action)}
                            onChange={() => toggleModuleItem(action)}
                            disabled={isViewMode}
                          />
                          <span>{t(`sysfunction.action.${action.toLowerCase()}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_mana}
                      onChange={(e) => setFormData({ ...formData, is_mana: e.target.checked })}
                      disabled={isViewMode}
                    />
                    {t('sysFunctions.isMana')}
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      disabled={isViewMode}
                    />
                    {t('common.isActive')}
                  </label>
                </div>
              </div>
              </div>

              <div className="modal-actions">
                {!isViewMode && <button type="submit" className="btn-primary">{t('common.save')}</button>}
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  {isViewMode ? t('common.close') : t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemFunctionsPage;
