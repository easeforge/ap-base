/**
 * FunctionPageHeader
 * 統一的功能頁面標題元件
 * 中文語系顯示 func_cname，英文語系顯示 func_ename
 * 下方顯示：description
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFunctionInfo } from '../hooks/useFunctionName';

interface Props {
  funcCode: string;
  fallback?: string;
  subtitle?: string;
}

const FunctionPageHeader: React.FC<Props> = ({ funcCode, fallback = '', subtitle }) => {
  const { i18n } = useTranslation();
  const { cname, ename, description } = useFunctionInfo(funcCode);

  const isZh = i18n.language === 'zh-TW';
  const title = isZh ? (cname || fallback || funcCode) : (ename || fallback || funcCode);

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
