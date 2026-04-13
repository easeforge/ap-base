/**
 * 應用程式主元件 - 後臺管理基底平台
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SystemProvider } from './contexts/SystemContext';
import { AuthProvider } from './contexts/AuthContext';
import { useSystem } from './contexts/SystemContext';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import MaintenancePage from './pages/MaintenancePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrganizationsPage from './pages/OrganizationsPage';
import SysProfilePage from './pages/SysProfilePage';
import UserRolesPage from './pages/UserRolesPage';
import UsersPage from './pages/UsersPage';
import SystemFunctionsPage from './pages/SystemFunctionsPage';
import RoleRightsPage from './pages/RoleRightsPage';
import UserLogsPage from './pages/UserLogsPage';
import SystemCodesPage from './pages/SystemCodesPage';
import SystemNotificationsPage from './pages/SystemNotificationsPage';
import TenantProfilePage from './pages/TenantProfilePage';
import TenantUsersPage from './pages/TenantUsersPage';
import HomePage from './pages/HomePage';
import MyProfilePage from './pages/MyProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import MainLayout from './components/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import ProjectRoutes from './routes/appRoutes';

/**
 * 應用程式路由
 * 根據系統維護狀態決定顯示內容
 */
const AppRoutes: React.FC = () => {
  const { isService, isLoading } = useSystem();

  // 更新網頁 title
  useDocumentTitle();

  // 載入中
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        系統載入中...
      </div>
    );
  }

  // 系統維護中
  if (!isService) {
    return <MaintenancePage />;
  }

  // 正常服務
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/home" replace />} />
        {/* ===== 基底平台路由（Base AP — 請勿修改此區塊）===== */}
        <Route path="home" element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {/* 系統管理 */}
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="sys_profile" element={<SysProfilePage />} />
        <Route path="user_roles" element={<UserRolesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="system_functions" element={<SystemFunctionsPage />} />
        <Route path="role_rights" element={<RoleRightsPage />} />
        <Route path="user_logs" element={<UserLogsPage />} />
        <Route path="system_codes" element={<SystemCodesPage />} />
        <Route path="system_notifications" element={<SystemNotificationsPage />} />
        {/* 租戶管理 */}
        <Route path="org_profile" element={<div>組織資料檔案</div>} />
        <Route path="tenant_profile" element={<TenantProfilePage />} />
        <Route path="tenant_users" element={<TenantUsersPage />} />
        {/* 個人化功能 */}
        <Route path="my_profile" element={<MyProfilePage />} />
        <Route path="change_password" element={<ChangePasswordPage />} />

        {/* ===== 應用專案路由（自動載入 routes/appRoutes.tsx）===== */}
        <ProjectRoutes />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

/**
 * 應用程式主元件
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SystemProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </SystemProvider>
    </BrowserRouter>
  );
};

export default App;
