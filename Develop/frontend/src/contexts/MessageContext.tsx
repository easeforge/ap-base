/**
 * 訊息通知 Context
 * 提供全域的 toast/snackbar 訊息顯示機制，搭配 sys_message_code 代碼系統使用
 *
 * 使用方式：
 *   const { showSuccess, showError } = useMessage();
 *   showSuccess('SYS020001', { name: '組織單位' });
 *   showError('ERR020001', { entity: '使用者', id: '123' });
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';
import { useSystem } from './SystemContext';

type Severity = AlertColor; // 'success' | 'info' | 'warning' | 'error'

interface MessageItem {
  id: number;
  code: string;
  text: string;
  severity: Severity;
}

interface MessageContextType {
  showMessage: (code: string, severity: Severity, params?: Record<string, string>) => void;
  showSuccess: (code: string, params?: Record<string, string>) => void;
  showError: (code: string, params?: Record<string, string>) => void;
  showWarning: (code: string, params?: Record<string, string>) => void;
  showInfo: (code: string, params?: Record<string, string>) => void;
  /**
   * 處理 axios 錯誤回應，自動抽取 detail 中的代碼與參數並顯示
   * detail 可能為字串（純代碼）或物件（{code, params}）
   */
  showApiError: (err: any, fallbackCode?: string, fallbackParams?: Record<string, string>) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

// 不同 severity 的自動關閉時間（毫秒）
const AUTO_HIDE_DURATION: Record<Severity, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 6000,
};

interface MessageProviderProps {
  children: ReactNode;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const { getMessageByCode } = useSystem();
  const [queue, setQueue] = useState<MessageItem[]>([]);
  const [current, setCurrent] = useState<MessageItem | null>(null);

  // 加入訊息到 queue
  const showMessage = useCallback(
    (code: string, severity: Severity, params?: Record<string, string>) => {
      const text = getMessageByCode(code, params);
      const item: MessageItem = {
        id: Date.now() + Math.random(),
        code,
        text,
        severity,
      };
      setQueue(prev => [...prev, item]);
    },
    [getMessageByCode]
  );

  const showSuccess = useCallback(
    (code: string, params?: Record<string, string>) => showMessage(code, 'success', params),
    [showMessage]
  );
  const showError = useCallback(
    (code: string, params?: Record<string, string>) => showMessage(code, 'error', params),
    [showMessage]
  );
  const showWarning = useCallback(
    (code: string, params?: Record<string, string>) => showMessage(code, 'warning', params),
    [showMessage]
  );
  const showInfo = useCallback(
    (code: string, params?: Record<string, string>) => showMessage(code, 'info', params),
    [showMessage]
  );

  // 統一處理 API 錯誤：自動解析 detail（字串代碼 或 {code, params} 物件）
  const showApiError = useCallback(
    (err: any, fallbackCode: string = 'ERR020004', fallbackParams?: Record<string, string>) => {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        showMessage(detail, 'error');
      } else if (detail && typeof detail === 'object' && detail.code) {
        showMessage(detail.code, 'error', detail.params);
      } else {
        const params = fallbackParams || {
          operation: '操作',
          detail: err?.message || 'Unknown error',
        };
        showMessage(fallbackCode, 'error', params);
      }
    },
    [showMessage]
  );

  // 從 queue 取下一則訊息顯示
  React.useEffect(() => {
    if (current === null && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  const handleClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setCurrent(null);
  };

  return (
    <MessageContext.Provider value={{ showMessage, showSuccess, showError, showWarning, showInfo, showApiError }}>
      {children}
      <Snackbar
        open={current !== null}
        autoHideDuration={current ? AUTO_HIDE_DURATION[current.severity] : 3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {current ? (
          <Alert
            onClose={handleClose}
            severity={current.severity}
            variant="filled"
            sx={{ minWidth: '300px', maxWidth: '600px' }}
          >
            {current.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </MessageContext.Provider>
  );
};

export const useMessage = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};
