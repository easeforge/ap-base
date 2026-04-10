/**
 * Rich Text Editor (簡易版)
 * 使用 textarea 作為基底富文本編輯器
 */

import React from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  [key: string]: any;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '',
  ...rest
}) => {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      style={{
        width: '100%',
        minHeight: '120px',
        padding: '8px 12px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical',
      }}
    />
  );
};

export default RichTextEditor;
