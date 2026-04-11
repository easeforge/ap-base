/**
 * 側邊欄選單元件
 * 顯示系統功能選單（從 system_functions 資料表）
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SystemFunction } from '../types';
import { systemService } from '../api/systemService';
import '../styles/Sidebar.css';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  width?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, width = 260 }) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [menuItems, setMenuItems] = useState<SystemFunction[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [popupExpandedItems, setPopupExpandedItems] = useState<Set<number>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; maxHeight: number } | null>(null);

  // 從 API 載入選單項目
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const functions = await systemService.getFunctions();
        console.log('Loaded menu functions:', functions);
        // 過濾掉 func_order 1-9 的項目 (保留 10 以上的項目)
        const filteredFunctions = filterMenuItems(functions);
        setMenuItems(filteredFunctions);
      } catch (error) {
        console.error('Failed to load menu items:', error);
      }
    };

    loadMenuItems();
  }, []);

  // 遞迴過濾選單項目，只保留 func_order >= 10 的項目
  const filterMenuItems = (items: SystemFunction[]): SystemFunction[] => {
    return items
      .filter(item => item.func_order >= 10)
      .map(item => ({
        ...item,
        children: item.children ? filterMenuItems(item.children) : undefined
      }));
  };

  const toggleExpand = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleMouseEnter = (e: React.MouseEvent, itemId: number) => {
    if (isCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const margin = 20;

      // 從觸發項目位置開始
      let adjustedTop = rect.top;

      // 計算可用的最大高度
      let maxHeight = viewportHeight - adjustedTop - margin;

      // 如果下方空間太小（少於 200px），往上移
      if (maxHeight < 200) {
        adjustedTop = margin;
        maxHeight = viewportHeight - margin * 2;
      }

      // 確保不超出上方
      adjustedTop = Math.max(margin, adjustedTop);
      maxHeight = viewportHeight - adjustedTop - margin;

      setPopupPosition({ top: adjustedTop, maxHeight });
      setHoveredItem(itemId);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      setHoveredItem(null);
      setPopupPosition(null);
      setPopupExpandedItems(new Set()); // 清空懸浮選單的展開狀態
    }
  };

  const togglePopupExpand = (itemId: number) => {
    const newExpanded = new Set(popupExpandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setPopupExpandedItems(newExpanded);
  };

  // 根據功能類型取得預設圖示
  const getDefaultIcon = (funcType: number): string => {
    return funcType === 1 ? '🗂️' : '🏷️';
  };

  // 遞迴渲染懸浮選單的多層次項目
  const renderPopupSubmenu = (items: SystemFunction[], level: number): React.ReactNode => {
    return items.map((child) => {
      const childPath = child.func_code ? `/${child.func_code}` : '#';
      const childName = i18n.language === 'en' ? child.func_ename : child.func_cname;
      const hasGrandChildren = child.children && child.children.length > 0;
      const isPopupExpanded = popupExpandedItems.has(child.id);

      return (
        <div key={child.id} className={`popup-submenu-item level-${level}`}>
          {hasGrandChildren && child.children ? (
            <>
              <div
                className="popup-submenu-parent"
                onClick={() => togglePopupExpand(child.id)}
                {...(child.description && { title: child.description })}
              >
                <span className="menu-icon">{child.func_icon || getDefaultIcon(child.func_type)}</span>
                <span className="menu-text">{childName}</span>
                <span className="expand-icon">{isPopupExpanded ? '▼' : '▶'}</span>
              </div>
              {isPopupExpanded && (
                <div className="popup-submenu-children">
                  {renderPopupSubmenu(child.children, level + 1)}
                </div>
              )}
            </>
          ) : (
            <Link
              to={childPath}
              className={`popup-menu-link ${isActive(childPath) ? 'active' : ''}`}
              {...(child.description && { title: child.description })}
            >
              <span className="menu-icon">{child.func_icon || getDefaultIcon(child.func_type)}</span>
              <span className="menu-text">{childName}</span>
            </Link>
          )}
        </div>
      );
    });
  };

  const renderMenuItem = (item: SystemFunction, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isHovered = hoveredItem === item.id;
    const mainPath = item.func_code ? `/${item.func_code}` : '#';

    // 根據當前語言選擇顯示文字
    const displayName = i18n.language === 'en' ? item.func_ename : item.func_cname;

    return (
      <div
        key={item.id}
        className={`menu-item level-${level}`}
      >
        {hasChildren ? (
          <div className="menu-item-wrapper">
            <div
              className={`menu-link ${isExpanded ? 'expanded' : ''}`}
              onClick={() => !isCollapsed && toggleExpand(item.id)}
              onMouseEnter={(e) => handleMouseEnter(e, item.id)}
              onMouseLeave={handleMouseLeave}
              {...(item.description && { title: item.description })}
            >
              <span className="menu-icon">{item.func_icon || getDefaultIcon(item.func_type)}</span>
              {!isCollapsed && (
                <>
                  <span className="menu-text">{displayName}</span>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </>
              )}
            </div>
            {/* 展開狀態的子選單 */}
            {isExpanded && !isCollapsed && item.children && (
              <div className="submenu">
                {item.children.map((child) => renderMenuItem(child, level + 1))}
              </div>
            )}
            {/* 收合狀態的懸浮子選單 */}
            {isCollapsed && isHovered && item.children && item.children.length > 0 && popupPosition && (
              <div
                className="popup-submenu"
                style={{ top: `${popupPosition.top}px`, maxHeight: `${popupPosition.maxHeight}px` }}
                onMouseEnter={(e) => handleMouseEnter(e, item.id)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="popup-submenu-header">{displayName}</div>
                {renderPopupSubmenu(item.children, 0)}
              </div>
            )}
          </div>
        ) : (
          <Link
            to={mainPath}
            className={`menu-link ${isActive(mainPath) ? 'active' : ''}`}
            {...(item.description && { title: item.description })}
          >
            <span className="menu-icon">{item.func_icon || getDefaultIcon(item.func_type)}</span>
            {!isCollapsed && <span className="menu-text">{displayName}</span>}
          </Link>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      style={{ width: isCollapsed ? '70px' : `${width}px` }}
    >
      <div className="sidebar-header">
        {!isCollapsed && <h2 className="sidebar-title">{t('sidebar.menu')}</h2>}
        <button className="toggle-button" onClick={onToggle}>
          {isCollapsed ? '☰' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>
    </aside>
  );
};

export default Sidebar;
