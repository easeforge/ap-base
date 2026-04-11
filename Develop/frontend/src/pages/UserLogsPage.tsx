/**
 * 使用者日誌頁面
 */

import React, { useState, useEffect, useRef } from 'react';
import { getUserLogs, UserLog, UserLogQueryParams } from '../services/userLogService';
import { getUsers, UserDetail } from '../services/userService';
import { getSysFunctions, SysFunction } from '../services/sysFunctionService';
import { usePermission } from '../hooks/usePermission';
import { useTranslation } from 'react-i18next';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { logView, logRead } from '../utils/userLogHelper';
import { getI18nValue } from '../utils/i18nHelper';
import '../styles/DataTable.css';

const UserLogsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const hasInitialized = useRef(false);
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 篩選選項資料
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [functions, setFunctions] = useState<SysFunction[]>([]);

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 查詢參數
  const [queryParams, setQueryParams] = useState<UserLogQueryParams>({
    skip: 0,
    limit: 1000 // 取得較多資料，前端進行分頁
  });

  // 載入篩選選項資料
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [usersData, functionsData] = await Promise.all([
          getUsers({}),
          getSysFunctions({})
        ]);
        setUsers(usersData);
        setFunctions(functionsData.filter(f => f.func_type === 2)); // 只顯示功能類型（非節點）
      } catch (error) {
        console.error('載入篩選選項失敗:', error);
      }
    };
    loadFilterOptions();
  }, []);

  // 首次載入
  useEffect(() => {
    // 等待權限載入完成後再檢查權限並載入資料
    if (!permissionLoading && hasPermission('user_logs', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          await loadLogs();
          await logView('user_logs', { filters: queryParams }, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('user_logs', { filters: queryParams }, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading]);

  // 自動篩選：當查詢參數變更時自動載入
  useEffect(() => {
    if (hasInitialized.current) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    queryParams.user_id,
    queryParams.system_function_id,
    queryParams.module_item,
    queryParams.has_error,
    queryParams.start_date,
    queryParams.end_date
  ]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getUserLogs(queryParams);
      setLogs(data);
      setCurrentPage(1); // 重置到第一頁
    } catch (error) {
      console.error('載入日誌失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatModuleItem = (item: string) => {
    const itemMap: Record<string, string> = {
      'View': t('userLogs.operations.view'),
      'Create': t('userLogs.operations.create'),
      'Read': t('userLogs.operations.read'),
      'Update': t('userLogs.operations.update'),
      'Delete': t('userLogs.operations.delete'),
      'Print': t('userLogs.operations.print'),
      'File': t('userLogs.operations.file'),
      'Login': t('userLogs.operations.login')
    };
    return itemMap[item] || item;
  };

  const getModuleItemBadgeClass = (item: string) => {
    const classMap: Record<string, string> = {
      'View': 'active',        // 綠色
      'Create': 'active',      // 綠色
      'Read': 'active',        // 綠色
      'Update': 'inactive',    // 紅色
      'Delete': 'inactive',    // 紅色
      'Print': 'active',       // 綠色
      'File': 'active',        // 綠色
      'Login': 'active'        // 綠色
    };
    return classMap[item] || 'active';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleViewDetail = async (log: UserLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);

    // 記錄 Read 日誌
    try {
      await logRead('user_logs', {
        log_id: log.id,
        user_name: log.user_name,
        function_name: log.function_name,
        module_item: log.module_item
      });
    } catch (err) {
      console.error('[UserLogsPage] Failed to log Read:', err);
    }
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedLog(null);
  };

  // 計算分頁
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = logs.slice(startIndex, endIndex);

  if (!hasPermission('user_logs', 'read')) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="user_logs" />
      </div>

      {/* 查詢條件 */}
      <div className="filter-section" style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* 使用者名稱 */}
          <div style={{ minWidth: '160px', flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>{t('userLogs.filters.user')}</label>
            <select
              value={queryParams.user_id || ''}
              onChange={(e) => setQueryParams({ ...queryParams, user_id: Number(e.target.value) || undefined })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
            >
              <option value="">{t('userLogs.filters.allUsers')}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          {/* 功能名稱 */}
          <div style={{ minWidth: '160px', flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>{t('userLogs.filters.function')}</label>
            <select
              value={queryParams.system_function_id || ''}
              onChange={(e) => setQueryParams({ ...queryParams, system_function_id: Number(e.target.value) || undefined })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
            >
              <option value="">{t('userLogs.filters.allFunctions')}</option>
              {functions.map((func) => (
                <option key={func.id} value={func.id}>
                  {getI18nValue(func.func_name, i18n.language)}
                </option>
              ))}
            </select>
          </div>

          {/* 操作類型 */}
          <div style={{ minWidth: '120px', flex: '0.8' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>{t('userLogs.filters.operation')}</label>
            <select
              value={queryParams.module_item || ''}
              onChange={(e) => setQueryParams({ ...queryParams, module_item: e.target.value || undefined })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
            >
              <option value="">{t('userLogs.filters.allOperations')}</option>
              <option value="View">{t('userLogs.operations.view')}</option>
              <option value="Create">{t('userLogs.operations.create')}</option>
              <option value="Read">{t('userLogs.operations.read')}</option>
              <option value="Update">{t('userLogs.operations.update')}</option>
              <option value="Delete">{t('userLogs.operations.delete')}</option>
              <option value="Print">{t('userLogs.operations.print')}</option>
              <option value="File">{t('userLogs.operations.file')}</option>
              <option value="Login">{t('userLogs.operations.login')}</option>
            </select>
          </div>

          {/* 狀態 */}
          <div style={{ minWidth: '100px', flex: '0.6' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>{t('userLogs.filters.status')}</label>
            <select
              value={queryParams.has_error === undefined ? '' : queryParams.has_error ? 'true' : 'false'}
              onChange={(e) => setQueryParams({
                ...queryParams,
                has_error: e.target.value === '' ? undefined : e.target.value === 'true'
              })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
            >
              <option value="">{t('userLogs.filters.allStatuses')}</option>
              <option value="false">{t('userLogs.filters.statusNormal')}</option>
              <option value="true">{t('userLogs.filters.statusError')}</option>
            </select>
          </div>

          {/* 開始時間 */}
          <div style={{ minWidth: '180px', flex: '1.2' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>{t('userLogs.filters.startTime')}</label>
            <input
              type="datetime-local"
              value={queryParams.start_date || ''}
              onChange={(e) => setQueryParams({ ...queryParams, start_date: e.target.value || undefined })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
            />
          </div>

          {/* 結束時間 */}
          <div style={{ minWidth: '180px', flex: '1.2' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>{t('userLogs.filters.endTime')}</label>
            <input
              type="datetime-local"
              value={queryParams.end_date || ''}
              onChange={(e) => setQueryParams({ ...queryParams, end_date: e.target.value || undefined })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
            />
          </div>

          {/* 重置按鈕 */}
          <div style={{ minWidth: '60px' }}>
            <button
              onClick={() => setQueryParams({ skip: 0, limit: 1000 })}
              style={{ width: '100%', padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px' }}
              title={t('userLogs.filters.reset')}
            >
              {t('userLogs.filters.reset')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">{t('common.loading')}</div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead className="table-header-dark-green">
                <tr>
                  <th>{t('userLogs.table.id')}</th>
                  <th>{t('userLogs.table.user')}</th>
                  <th>{t('userLogs.table.sessionId')}</th>
                  <th>{t('userLogs.table.function')}</th>
                  <th>{t('userLogs.table.dataId')}</th>
                  <th>{t('userLogs.table.operation')}</th>
                  <th>{t('userLogs.table.time')}</th>
                  <th>{t('userLogs.table.status')}</th>
                  <th>{t('userLogs.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                      查無資料
                    </td>
                  </tr>
                ) : (
                  currentLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.user_name || `ID:${log.user_id}`}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6c757d' }}>
                        {log.session_id ? log.session_id.substring(0, 8) + '...' : '-'}
                      </td>
                      <td>
                        {i18n.language === 'zh-TW'
                          ? (log.function_cname || log.function_name || `ID:${log.system_function_id}`)
                          : (log.function_ename || log.function_name || `ID:${log.system_function_id}`)
                        }
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {log.data_id || '-'}
                      </td>
                      <td>
                        <span className={`status-badge ${getModuleItemBadgeClass(log.module_item)}`}>
                          {formatModuleItem(log.module_item)}
                        </span>
                      </td>
                      <td>{formatDateTime(log.action_at)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {log.err_detail ? (
                          <span className="status-badge inactive">{t('userLogs.filters.statusError')}</span>
                        ) : (
                          <span className="status-badge active">{t('userLogs.filters.statusNormal')}</span>
                        )}
                      </td>
                      <td className="actions">
                        <button
                          onClick={() => handleViewDetail(log)}
                          className="btn-secondary"
                        >
                          {t('userLogs.table.viewDetail')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分頁控制 */}
          <div className="pagination-container">
            <div className="pagination-info">
              <label>
                每頁顯示：
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                筆
              </label>
              <span className="pagination-text">
                共 {logs.length} 筆資料，第 {currentPage} / {totalPages} 頁
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

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  if (index > 0 && array[index - 1] !== page - 1) {
                    return (
                      <React.Fragment key={`ellipsis-${page}`}>
                        <span className="pagination-ellipsis">...</span>
                        <button
                          className={`btn-pagination ${currentPage === page ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  }
                  return (
                    <button
                      key={page}
                      className={`btn-pagination ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}

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

      {/* 詳情 Modal */}
      {showDetailModal && selectedLog && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 {t('userLogs.detail.title')}</h2>
              <button className="modal-close" onClick={handleCloseDetail}>×</button>
            </div>
            <div className="modal-body">
              {/* 基本資訊卡片 */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '8px' }}>
                  {t('userLogs.detail.basicInfo')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.id')}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>{selectedLog.id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.time')}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>{formatDateTime(selectedLog.action_at)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.user')}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>{selectedLog.user_name || `ID:${selectedLog.user_id}`}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.function')}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>
                      {i18n.language === 'zh-TW'
                        ? (selectedLog.function_cname || selectedLog.function_name || `ID:${selectedLog.system_function_id}`)
                        : (selectedLog.function_ename || selectedLog.function_name || `ID:${selectedLog.system_function_id}`)
                      }
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.sessionId')}</div>
                    <div style={{ fontSize: '13px', fontWeight: '400', color: '#6c757d', fontFamily: 'monospace' }}>
                      {selectedLog.session_id || '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.dataId')}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>
                      {selectedLog.data_id || '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.status')}</div>
                    <div>
                      {selectedLog.err_detail ? (
                        <span className="status-badge inactive">{t('userLogs.filters.statusError')}</span>
                      ) : (
                        <span className="status-badge active">{t('userLogs.filters.statusNormal')}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{t('userLogs.table.operation')}</div>
                    <div>
                      <span className={`status-badge ${getModuleItemBadgeClass(selectedLog.module_item)}`} style={{ fontSize: '13px' }}>
                        {formatModuleItem(selectedLog.module_item)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 錯誤訊息 */}
              {selectedLog.err_detail && (
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{
                    marginTop: 0,
                    marginBottom: '12px',
                    fontSize: '15px',
                    color: '#856404',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>⚠️</span> {t('userLogs.detail.errorDetail')}
                  </h3>
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#856404',
                    fontSize: '13px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    backgroundColor: '#fff',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid #ffeeba'
                  }}>
                    {selectedLog.err_detail}
                  </pre>
                </div>
              )}

              {/* 資料區域 - 並排顯示 */}
              {((selectedLog.look_data && Object.keys(selectedLog.look_data).length > 0) ||
                (selectedLog.change_data && Object.keys(selectedLog.change_data).length > 0)) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* 檢視資料 */}
                  {selectedLog.look_data && Object.keys(selectedLog.look_data).length > 0 && (
                    <div>
                      <h3 style={{
                        marginTop: 0,
                        marginBottom: '12px',
                        fontSize: '15px',
                        color: '#495057',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '2px solid #dee2e6',
                        paddingBottom: '8px'
                      }}>
                        <span>👁️</span> {t('userLogs.detail.lookData')}
                      </h3>
                      <div style={{
                        margin: 0,
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '13px',
                        fontFamily: 'Consolas, Monaco, monospace',
                        border: '1px solid #dee2e6',
                        maxHeight: '400px',
                        lineHeight: '1.8'
                      }}>
                        {Object.entries(selectedLog.look_data).map(([key, value]) => {
                          const hasChangeData = selectedLog.change_data && key in selectedLog.change_data;
                          const isDifferent = hasChangeData && JSON.stringify(selectedLog.change_data[key]) !== JSON.stringify(value);

                          return (
                            <div key={key} style={{
                              padding: '6px 8px',
                              marginBottom: '4px',
                              borderRadius: '4px',
                              backgroundColor: isDifferent ? '#fff3cd' : 'transparent',
                              border: isDifferent ? '1px solid #ffc107' : 'none'
                            }}>
                              <span style={{ color: '#0066cc', fontWeight: 600 }}>{key}</span>
                              <span style={{ color: '#666' }}>: </span>
                              <span style={{ color: isDifferent ? '#856404' : '#333' }}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 異動資料 */}
                  {selectedLog.change_data && Object.keys(selectedLog.change_data).length > 0 && (
                    <div>
                      <h3 style={{
                        marginTop: 0,
                        marginBottom: '12px',
                        fontSize: '15px',
                        color: '#495057',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '2px solid #dee2e6',
                        paddingBottom: '8px'
                      }}>
                        <span>✏️</span> {t('userLogs.detail.changeData')}
                      </h3>
                      <div style={{
                        margin: 0,
                        padding: '16px',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '13px',
                        fontFamily: 'Consolas, Monaco, monospace',
                        border: '1px solid #b8daff',
                        maxHeight: '400px',
                        lineHeight: '1.8'
                      }}>
                        {Object.entries(selectedLog.change_data).map(([key, value]) => {
                          const hasLookData = selectedLog.look_data && key in selectedLog.look_data;
                          const isDifferent = hasLookData && JSON.stringify(selectedLog.look_data[key]) !== JSON.stringify(value);

                          return (
                            <div key={key} style={{
                              padding: '6px 8px',
                              marginBottom: '4px',
                              borderRadius: '4px',
                              backgroundColor: isDifferent ? '#d4edda' : 'transparent',
                              border: isDifferent ? '1px solid #28a745' : 'none'
                            }}>
                              <span style={{ color: '#0066cc', fontWeight: 600 }}>{key}</span>
                              <span style={{ color: '#666' }}>: </span>
                              <span style={{ color: isDifferent ? '#155724' : '#333' }}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={handleCloseDetail} className="btn-secondary" style={{ minWidth: '100px' }}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLogsPage;
