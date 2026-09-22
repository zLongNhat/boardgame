import React, { createContext, useContext, useEffect, useState } from 'react';
import { PublicUser } from '../types/game';

interface AuthContextType {
  user: PublicUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (
    username: string,
    password: string,
    displayName: string,
    avatar: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(() => {
    const saved = localStorage.getItem('omnideck_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('omnideck_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch updated profile on mount if token is present
  const refreshUser = async () => {
    const currentToken = localStorage.getItem('omnideck_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('omnideck_user', JSON.stringify(data.user));
      } else {
        // Token expired or invalid
        setUser(null);
        setToken(null);
        localStorage.removeItem('omnideck_token');
        localStorage.removeItem('omnideck_user');
      }
    } catch (err) {
      console.warn('[Auth] Failed to verify current user session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('omnideck_token', data.token);
        localStorage.setItem('omnideck_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.message || 'Đăng nhập không thành công.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  const register = async (
    username: string,
    password: string,
    displayName: string,
    avatar: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName, avatar })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('omnideck_token', data.token);
        localStorage.setItem('omnideck_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.message || 'Đăng ký tài khoản không thành công.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('omnideck_token');
    localStorage.removeItem('omnideck_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
