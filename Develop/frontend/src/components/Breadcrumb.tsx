/**
 * 麵包屑導航元件
 * 根據當前路徑自動生成導航路徑
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { systemService } from '../api/systemService';
import { useSystem } from '../contexts/SystemContext';
import { SystemFunction } from '../types';
import '../styles/Breadcrumb.css';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const { systemProfile } = useSystem();
  const systemTitle = i18n.language === 'en'
    ? (systemProfile?.sys_etitle || 'Paris Agreement Article 6.4 Management System')
    : (systemProfile?.sys_ctitle || '碳排專案活動申請系統(Article 6.4)');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [menuItems, setMenuItems] = useState<SystemFunction[]>([]);

  // 載入選單項目
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const functions = await systemService.getFunctions();
        setMenuItems(functions);
      } catch (error) {
        console.error('Failed to load menu items for breadcrumb:', error);
      }
    };

    loadMenuItems();
  }, []);

  // 根據路徑生成麵包屑
  useEffect(() => {
    if (menuItems.length === 0) return;

    const path = location.pathname;
    const crumbs: BreadcrumbItem[] = [];

    // 首頁
    crumbs.push({
      label: i18n.language === 'en' ? 'Home' : '首頁',
      path: '/dashboard'
    });

    // 如果不是首頁，查找對應的選單項目
    if (path !== '/' && path !== '/dashboard') {
      const findMenuItem = (items: SystemFunction[], targetPath: string): SystemFunction | null => {
        for (const item of items) {
          // 檢查當前項目（使用 func_code 匹配前端路由）
          if (item.func_code) {
            const itemPath = `/${item.func_code}`;
            if (itemPath === targetPath) {
              return item;
            }
          }

          // 檢查子項目
          if (item.children && item.children.length > 0) {
            const found = findMenuItem(item.children, targetPath);
            if (found) return found;
          }
        }
        return null;
      };

      const findParent = (items: SystemFunction[], childId: number): SystemFunction | null => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            if (item.children.some(child => child.id === childId)) {
              return item;
            }
            const found = findParent(item.children, childId);
            if (found) return found;
          }
        }
        return null;
      };

      const currentItem = findMenuItem(menuItems, path);

      if (currentItem) {
        const pathItems: SystemFunction[] = [];

        // 找出所有父項目
        let parent = findParent(menuItems, currentItem.id);
        while (parent) {
          pathItems.unshift(parent);
          parent = findParent(menuItems, parent.id);
        }

        // 添加父項目到麵包屑（使用 func_code 作為前端路徑）
        pathItems.forEach(item => {
          const itemPath = item.func_code ? `/${item.func_code}` : '#';
          crumbs.push({
            label: i18n.language === 'en' ? item.func_ename : item.func_cname,
            path: itemPath
          });
        });

        // 添加當前項目
        crumbs.push({
          label: i18n.language === 'en' ? currentItem.func_ename : currentItem.func_cname,
          path: path
        });
      }
    }

    setBreadcrumbs(crumbs);
  }, [location.pathname, menuItems, i18n.language]);

  if (breadcrumbs.length <= 1) {
    return null; // 只有首頁時不顯示麵包屑
  }

  return (
    <nav className="breadcrumb-nav" aria-label="breadcrumb">
      <ol className="breadcrumb">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={index} className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
              {isLast ? (
                <span>{crumb.label}</span>
              ) : (
                <>
                  {index === 0 ? (
                    <Link to={crumb.path}>{crumb.label}</Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  <span className="breadcrumb-separator">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
