/**
 * 主要佈局元件
 * 包含：左側選單、上方使用者資訊、中間內容區、下方版權
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import {
  AccountCircle,
  Lock,
  Logout as LogoutIcon,
  VpnKey,
  Person,
  ManageAccounts,
  Settings,
  Security
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import { getSystemFunctions } from '../services/systemFunctionsService';
import type { SystemFunction } from '../types/systemFunctions';
import { getI18nValue } from '../utils/i18nHelper';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import LanguageSwitcher from './LanguageSwitcher';
import Breadcrumb from './Breadcrumb';
import '../styles/MainLayout.css';

// Material-UI 圖示映射
const iconMap: Record<string, React.ReactElement> = {
  'AccountCircle': <AccountCircle fontSize="small" />,
  'Person': <Person fontSize="small" />,
  'ManageAccounts': <ManageAccounts fontSize="small" />,
  'Lock': <Lock fontSize="small" />,
  'VpnKey': <VpnKey fontSize="small" />,
  'Security': <Security fontSize="small" />,
  'Settings': <Settings fontSize="small" />,
};

// 根據 func_icon 名稱或 emoji 取得對應的顯示內容
const getIconComponent = (iconName?: string): React.ReactNode => {
  if (!iconName) return <AccountCircle fontSize="small" />;

  // 如果是 Material-UI 圖示名稱，返回對應的圖示元件
  if (iconMap[iconName]) {
    return iconMap[iconName];
  }

  // 否則直接顯示字串（支援 emoji），字級與 Sidebar 懸浮選單一致
  return <span style={{ fontSize: '16px' }}>{iconName}</span>;
};

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { systemProfile, getCopyright, getLayoutMode } = useSystem();
  const layoutMode = getLayoutMode();
  const isHorizontal = layoutMode === 'horizontal';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 260;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // 載入使用者下拉選單功能（personal_function 節點下的子功能）
  const [userMenuItems, setUserMenuItems] = useState<SystemFunction[]>([]);

  useEffect(() => {
    const loadMenuFunctions = async () => {
      try {
        const functions = await getSystemFunctions({
          is_active: true,
          limit: 1000
        });

        // 找到 personal_function 節點
        const personalNode = functions.find(f => f.func_code === 'personal_function');
        if (personalNode) {
          // 取得該節點下的子功能，依 func_order 排序
          const children = functions
            .filter(f => f.upper_func_id === personalNode.id && f.func_type === 2)
            .sort((a, b) => a.func_order - b.func_order);
          setUserMenuItems(children);
        }
      } catch (error) {
        console.error('載入選單功能失敗:', error);
      }
    };

    loadMenuFunctions();
  }, []);

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  // 點擊使用者選單項目
  const handleMenuItemClick = async (funcCode: string) => {
    handleUserMenuClose();
    if (funcCode === 'logout') {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('登出失敗:', error);
      }
    } else {
      navigate(`/${funcCode}`);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // 處理拖拽調整寬度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isSidebarCollapsed) return;

      const newWidth = e.clientX;
      // 限制寬度範圍: 最小 200px，最大 500px
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // 保存寬度到 localStorage
        localStorage.setItem('sidebarWidth', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarWidth, isSidebarCollapsed]);

  return (
    <div className={`main-layout layout-${layoutMode}`}>
      {/* 直式模式：左側選單 + 可拖拽分隔線 */}
      {!isHorizontal && (
        <>
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            width={sidebarWidth}
          />
          {!isSidebarCollapsed && (
            <div
              className="sidebar-resize-handle"
              onMouseDown={handleMouseDown}
              style={{ left: `${sidebarWidth}px` }}
            />
          )}
        </>
      )}

      {/* 內容區（橫式時不留左側邊距） */}
      <div
        className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}
        style={{
          marginLeft: isHorizontal ? 0 : (isSidebarCollapsed ? '70px' : `${sidebarWidth}px`)
        }}
      >
        {/* 上方使用者資訊列 */}
        <header className="top-header">
          <div className="header-left">
            <img src="/logo.png" alt="Logo" className="header-logo" />
            <span className="header-system-title">
              {getI18nValue(systemProfile?.sys_title, i18n.language, 'Base AP Management System')}
            </span>
          </div>
          <div className="header-right">
            <LanguageSwitcher />
            <div
              className="user-info"
              onMouseEnter={handleUserMenuClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-avatar">
                {user?.username?.charAt(0) || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.username || t('common.loading')}</div>
                <div className="user-role">
                  {user?.job_title || user?.department || t('header.userInfo')}
                </div>
              </div>
            </div>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              MenuListProps={{
                onMouseLeave: handleUserMenuClose,
                style: { pointerEvents: 'auto' }
              }}
              slotProps={{
                paper: {
                  onMouseEnter: () => {
                    // 當滑鼠進入選單時，取消任何待關閉的計時器
                  },
                  onMouseLeave: handleUserMenuClose,
                  sx: {
                    '& .MuiMenuItem-root': {
                      fontSize: '13px',
                      padding: '10px 16px',
                    },
                    '& .MuiListItemIcon-root': {
                      minWidth: '36px',
                    },
                    '& .MuiListItemText-primary': {
                      fontSize: '13px',
                    }
                  }
                }
              }}
            >
              {userMenuItems.flatMap((item) => {
                const isLogout = item.func_code === 'logout';
                const elements = [];
                if (isLogout) {
                  elements.push(<Divider key={`divider-${item.id}`} />);
                }
                elements.push(
                  <MenuItem key={item.id} onClick={() => handleMenuItemClick(item.func_code)}>
                    <ListItemIcon>
                      {item.func_icon
                        ? getIconComponent(item.func_icon)
                        : isLogout
                        ? <LogoutIcon fontSize="small" />
                        : <AccountCircle fontSize="small" />
                      }
                    </ListItemIcon>
                    <ListItemText>
                      {getI18nValue(item.func_name, i18n.language)}
                    </ListItemText>
                  </MenuItem>
                );
                return elements;
              })}
            </Menu>
          </div>
        </header>

        {/* 橫式模式：在 header 下方顯示頂部導覽 */}
        {isHorizontal && <TopNav />}

        {/* 中間內容區域 */}
        <main className="content-area">
          <div className="content-wrapper">
            <Breadcrumb />
            <Outlet />
          </div>
        </main>

        {/* 下方版權宣告 */}
        <footer className="bottom-footer">
          <div className="footer-content">
            <p className="copyright-text">
              {getCopyright() || (i18n.language === 'en'
                ? 'Copyright © 2026 JiangYun Co., Ltd.'
                : 'Copyright © 2026 匠耘有限公司')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
