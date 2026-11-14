import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserDTO, UserRole, StoreDTO, RegisterOwnerInput } from '@flex/shared';
import { adminApi } from '../services/api';

interface AuthUser extends UserDTO {
  role: UserRole;
  isSuperAdmin?: boolean;
}

interface AdminAuthContextType {
  user: AuthUser | null;
  currentStore: StoreDTO | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithToken: (token: string, storeId?: number) => Promise<void>;
  loginWithCredentials: (login: string, password: string) => Promise<void>;
  registerOwner: (data: RegisterOwnerInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}


const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentStore, setCurrentStore] = useState<StoreDTO | null>(null);
  const [token, setToken] = useState<string | null>(() => adminApi.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async (): Promise<void> => {
    try {
      const activeToken = adminApi.getToken();
      if (!activeToken) {
        setUser(null);
        setCurrentStore(null);
        return;
      }

      // Fetch user profile
      const userRes = await adminApi.get<AuthUser | { user: AuthUser }>('/auth/me');
      const profileUser = ('user' in userRes && userRes.user ? userRes.user : userRes) as AuthUser;
      setUser(profileUser);

      // Fetch store profile if owner/manager
      try {
        const stores = await adminApi.get<StoreDTO[]>('/store/profile');
        if (Array.isArray(stores) && stores.length > 0) {
          const activeStoreId = adminApi.getStoreId();
          const targetStore = stores.find((s) => s.id === activeStoreId) || stores[0];
          if (targetStore) {
            setCurrentStore(targetStore);
            adminApi.setStoreId(targetStore.id);
          }
        }
      } catch {
        // Store not set or empty
      }
    } catch (err) {
      console.warn('[AdminAuth] Profil yuklashda xatolik:', err);
      // Agar token muddati o'tgan bo'lsa
      adminApi.setToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithToken = async (newToken: string, storeId?: number): Promise<void> => {
    adminApi.setToken(newToken);
    if (storeId) {
      adminApi.setStoreId(storeId);
    }
    setToken(newToken);
    setIsLoading(true);
    await refreshProfile();
  };

  const loginWithCredentials = async (login: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await adminApi.post<{
        token: string;
        user: AuthUser;
        store?: { id: number; name: string; slug: string };
      }>('/auth/login', { login, password });

      adminApi.setToken(res.token);
      if (res.store) {
        adminApi.setStoreId(res.store.id);
      }
      setToken(res.token);
      setUser(res.user);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const registerOwner = async (data: RegisterOwnerInput): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await adminApi.post<{
        token: string;
        user: AuthUser;
        store: { id: number; name: string; slug: string };
      }>('/auth/register', data);

      adminApi.setToken(res.token);
      if (res.store) {
        adminApi.setStoreId(res.store.id);
      }
      setToken(res.token);
      setUser(res.user);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    adminApi.setToken(null);
    adminApi.setStoreId(null);
    setToken(null);
    setUser(null);
    setCurrentStore(null);
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        currentStore,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        loginWithToken,
        loginWithCredentials,
        registerOwner,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
