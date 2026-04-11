/**
 * FunctionPageHeader
 * 統一的功能頁面標題元件
 * 從 JSONB func_name 依語系取值
 * 下方顯示：description
 */

import React from 'react';
import { useFunctionInfo } from '../hooks/useFunctionName';

interface Props {
  funcCode: string;
  fallback?: string;
  subtitle?: string;
}

const FunctionPageHeader: React.FC<Props> = ({ funcCode, fallback = '', subtitle }) => {
  const { name, description } = useFunctionInfo(funcCode);

  const title = name || fallback || funcCode;

  return (
    <div className="page-header-left">
      <h1>{title}</h1>
      {description && (
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '0.9em',
          color: '#4A90E2',
          fontWeight: 'normal',
          whiteSpace: 'pre-wrap'
        }}>
          {description}
        </p>
      )}
      {subtitle && (
        <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: '#666' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default FunctionPageHeader;
