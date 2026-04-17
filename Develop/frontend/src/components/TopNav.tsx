/**
 * 橫式頂部導覽元件
 * 顯示系統功能選單（從 system_functions 資料表）
 * Hover 展開下拉子選單
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SystemFunction } from '../types';
import { systemService } from '../api/systemService';
import { getI18nValue } from '../utils/i18nHelper';
import '../styles/TopNav.css';

const TopNav: React.FC = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const [menuItems, setMenuItems] = useState<SystemFunction[]>([]);
  const [hoveredRoot, setHoveredRoot] = useState<number | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const functions = await systemService.getFunctions();
        const filtered = filterMenuItems(functions);
        setMenuItems(filtered);
      } catch (error) {
        console.error('Failed to load menu items:', error);
      }
    };
    loadMenuItems();
  }, []);

  // 遞迴過濾 func_order < 10 的隱藏功能
  const filterMenuItems = (items: SystemFunction[]): SystemFunction[] => {
    return items
      .filter(item => item.func_order >= 10)
      .map(item => ({
        ...item,
        children: item.children ? filterMenuItems(item.children) : undefined,
      }));
  };

  const isActive = (path: string) => location.pathname === path;

  // 判斷某個根節點的任何子孫是否為當前頁面
  const isRootActive = (item: SystemFunction): boolean => {
    if (isActive(`/${item.func_code}`)) return true;
    if (item.children && item.children.length > 0) {
      return item.children.some(child => isRootActive(child));
    }
    return false;
  };

  const handleMouseEnter = (itemId: number) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredRoot(itemId);
  };

  const handleMouseLeave = () => {
    // 延遲關閉，讓使用者能移到子選單
    hoverTimerRef.current = setTimeout(() => {
      setHoveredRoot(null);
    }, 150);
  };

  // 遞迴渲染下拉選單（含巢狀）
  const renderDropdownItems = (items: SystemFunction[], level: number = 0): React.ReactNode => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const label = getI18nValue(item.func_name, i18n.language);
      const path = `/${item.func_code}`;

      if (hasChildren) {
        return (
          <div key={item.id} className={`topnav-dropdown-group level-${level}`}>
            <div className="topnav-dropdown-header">
              {item.func_icon && <span className="topnav-icon">{item.func_icon}</span>}
              <span>{label}</span>
            </div>
            <div className="topnav-dropdown-children">
              {renderDropdownItems(item.children!, level + 1)}
            </div>
          </div>
        );
      }

      return (
        <Link
          key={item.id}
          to={path}
          className={`topnav-dropdown-item level-${level} ${isActive(path) ? 'active' : ''}`}
        >
          {item.func_icon && <span className="topnav-icon">{item.func_icon}</span>}
          <span>{label}</span>
        </Link>
      );
    });
  };

  return (
    <nav className="topnav">
      <ul className="topnav-list">
        {menuItems.map(item => {
          const hasChildren = item.children && item.children.length > 0;
          const label = getI18nValue(item.func_name, i18n.language);
          const path = `/${item.func_code}`;
          const active = isRootActive(item);

          return (
            <li
              key={item.id}
              className={`topnav-item ${active ? 'active' : ''}`}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
            >
              {hasChildren ? (
                <>
                  <div className="topnav-trigger">
                    {item.func_icon && <span className="topnav-icon">{item.func_icon}</span>}
                    <span>{label}</span>
                    <span className="topnav-arrow">▾</span>
                  </div>
                  {hoveredRoot === item.id && (
                    <div className="topnav-dropdown">
                      {renderDropdownItems(item.children!)}
                    </div>
                  )}
                </>
              ) : (
                <Link to={path} className="topnav-trigger">
                  {item.func_icon && <span className="topnav-icon">{item.func_icon}</span>}
                  <span>{label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TopNav;
