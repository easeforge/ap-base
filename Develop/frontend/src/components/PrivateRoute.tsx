/**
 * 受保護的路由元件
 * 需要登入才能存取
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  // 認證狀態初始化中，等待完成再判斷
  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    // 未登入，導向登入頁面
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
