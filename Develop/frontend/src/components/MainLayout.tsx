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
import { useProject } from '../contexts/ProjectContext';
import { getSystemFunctions } from '../services/systemFunctionsService';
import type { SystemFunction } from '../types/systemFunctions';
import Sidebar from './Sidebar';
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

// ── 案件選擇器（支援 HTML 渲染） ─────────────────────────
interface CaseItemDropdownProps {
  caseType: 'pdd' | 'nmeth';
  projects: any[];
  proposals: any[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  loading: boolean;
  isZh: boolean;
}

const CaseItemDropdown: React.FC<CaseItemDropdownProps> = ({
  caseType, projects, proposals, selectedId, onSelect, loading, isZh
}) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // 點擊外部關閉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 移除 HTML 中的 block 標籤（如 <p>），保留 inline 標籤（如 <sub><sup>）
  const stripBlock = (html: string) => html.replace(/<\/?p[^>]*>/gi, '').replace(/<\/?div[^>]*>/gi, '').trim();

  const items = caseType === 'pdd'
    ? projects.map(p => ({ id: p.id, html: `[${p.id}] ${stripBlock(p.project_title || '')}` }))
    : proposals.map(p => ({ id: p.id, html: `[${p.id}] ${stripBlock(p.title || '')}` }));

  const selectedItem = items.find(i => i.id === selectedId);
  const placeholder = loading
    ? (isZh ? '載入中...' : 'Loading...')
    : caseType === 'pdd'
      ? (isZh ? '— 請選擇專案 —' : '— Select Project —')
      : (isZh ? '— 請選擇提案 —' : '— Select Proposal —');

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: '320px', maxWidth: '600px', flex: 1 }}>
      {/* 觸發按鈕 */}
      <div
        className="case-item-select"
        onClick={() => { if (!loading) setOpen(!open); }}
        style={{ cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', height: '34px', padding: '0 32px 0 10px', overflow: 'hidden', whiteSpace: 'nowrap' }}
      >
        {selectedItem
          ? <span dangerouslySetInnerHTML={{ __html: selectedItem.html }} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} />
          : <span style={{ color: '#999' }}>{placeholder}</span>}
      </div>
      {/* 下拉選單 */}
      {open && (
        <div style={{
          position: 'absolute', top: '38px', left: 0, right: 0, zIndex: 9999,
          background: '#fff', border: '1px solid #d9d9d9', borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxHeight: '300px', overflowY: 'auto',
        }}>
          {/* 清除選擇 */}
          <div
            onClick={() => { onSelect(null); setOpen(false); }}
            style={{ padding: '8px 12px', fontSize: '13px', color: '#999', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            {placeholder}
          </div>
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false); }}
              style={{
                padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                background: item.id === selectedId ? '#e6f7ff' : '#fff',
                fontWeight: item.id === selectedId ? 600 : 400,
              }}
              onMouseEnter={e => { if (item.id !== selectedId) e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseLeave={e => { if (item.id !== selectedId) e.currentTarget.style.background = '#fff'; }}
            >
              <span dangerouslySetInnerHTML={{ __html: item.html }} />
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
              {isZh ? '無可選擇的項目' : 'No items available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { systemProfile, getCopyright } = useSystem();
  const {
    caseType, setCaseType,
    projects, selectedProjectId, setSelectedProjectId,
    proposals, selectedProposalId, setSelectedProposalId,
    loading: projectLoading
  } = useProject();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 260;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // 載入使用者選單功能的中英文名稱
  const [menuFunctions, setMenuFunctions] = useState<{
    my_profile?: SystemFunction;
    change_password?: SystemFunction;
    logout?: SystemFunction;
  }>({});

  // 載入功能名稱
  useEffect(() => {
    const loadMenuFunctions = async () => {
      try {
        // 載入所有活動的系統功能
        const functions = await getSystemFunctions({
          is_active: true,
          limit: 1000
        });

        // 篩選出需要的功能
        const functionsMap: Record<string, SystemFunction> = {};
        functions.forEach(func => {
          if (func.func_code === 'my_profile' ||
              func.func_code === 'change_password' ||
              func.func_code === 'logout') {
            functionsMap[func.func_code] = func;
          }
        });

        console.log('[MainLayout] 載入的選單功能:', functionsMap);
        setMenuFunctions(functionsMap);
      } catch (error) {
        console.error('載入選單功能失敗:', error);
        // 如果載入失敗，使用預設值（已在 JSX 中提供 fallback）
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

  const handleMyProfile = () => {
    handleUserMenuClose();
    navigate('/my_profile');
  };

  const handleChangePassword = () => {
    handleUserMenuClose();
    navigate('/change_password');
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
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
    <div className="main-layout">
      {/* 左側選單 */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        width={sidebarWidth}
      />

      {/* 拖拽調整寬度的分隔線 */}
      {!isSidebarCollapsed && (
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleMouseDown}
          style={{ left: `${sidebarWidth}px` }}
        />
      )}

      {/* 右側內容區 */}
      <div
        className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}
        style={{ marginLeft: isSidebarCollapsed ? '70px' : `${sidebarWidth}px` }}
      >
        {/* 上方使用者資訊列 */}
        <header className="top-header">
          <div className="header-left">
            <img src="/logo.png" alt="Logo" className="header-logo" />
            <span className="header-system-title">
              {i18n.language === 'en'
                ? (systemProfile?.sys_etitle || 'Paris Agreement Article 6.4 Management System')
                : (systemProfile?.sys_ctitle || '碳排專案活動申請系統(Article 6.4)')}
            </span>
            <div className="case-selector-wrap">
              <select
                className="case-type-select"
                value={caseType}
                onChange={e => setCaseType(e.target.value as 'pdd' | 'nmeth')}
              >
                <option value="pdd">{i18n.language === 'en' ? 'Project Design Document' : '專案設計文件'}</option>
                <option value="nmeth">{i18n.language === 'en' ? 'Methodology Proposal' : '方法論申請文件'}</option>
              </select>
              <CaseItemDropdown
                caseType={caseType}
                projects={projects}
                proposals={proposals}
                selectedId={caseType === 'pdd' ? selectedProjectId : selectedProposalId}
                onSelect={(id) => caseType === 'pdd' ? setSelectedProjectId(id) : setSelectedProposalId(id)}
                loading={projectLoading}
                isZh={i18n.language === 'zh-TW'}
              />
            </div>
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
              <MenuItem onClick={handleMyProfile}>
                <ListItemIcon>
                  {getIconComponent(menuFunctions.my_profile?.func_icon)}
                </ListItemIcon>
                <ListItemText>
                  {i18n.language === 'en'
                    ? (menuFunctions.my_profile?.func_ename || 'My Profile')
                    : (menuFunctions.my_profile?.func_cname || '個人資料')}
                </ListItemText>
              </MenuItem>
              <MenuItem onClick={handleChangePassword}>
                <ListItemIcon>
                  {getIconComponent(menuFunctions.change_password?.func_icon)}
                </ListItemIcon>
                <ListItemText>
                  {i18n.language === 'en'
                    ? (menuFunctions.change_password?.func_ename || 'Change Password')
                    : (menuFunctions.change_password?.func_cname || '密碼變更')}
                </ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  {menuFunctions.logout?.func_icon ?
                    getIconComponent(menuFunctions.logout.func_icon) :
                    <LogoutIcon fontSize="small" />
                  }
                </ListItemIcon>
                <ListItemText>
                  {menuFunctions.logout ? (
                    i18n.language === 'en'
                      ? (menuFunctions.logout.func_ename || 'Logout')
                      : (menuFunctions.logout.func_cname || '登出')
                  ) : (
                    t('userMenu.logout', '登出')
                  )}
                </ListItemText>
              </MenuItem>
            </Menu>
          </div>
        </header>

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
