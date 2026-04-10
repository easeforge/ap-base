/**
 * 認證狀態管理 Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { authService } from '../api/authService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 載入使用者資料
  const loadUser = async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('載入使用者資料失敗:', error);
      // 只清除 access_token,保留 txn_token
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // 登入
  const login = async (token: string) => {
    authService.saveToken(token);
    await loadUser();
  };

  // 登出
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('登出失敗:', error);
    } finally {
      authService.clearToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // 重新載入使用者資料
  const refreshUser = async () => {
    await loadUser();
  };

  // 初始化載入使用者
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 自訂 Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
