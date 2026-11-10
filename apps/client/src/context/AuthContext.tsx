import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserDTO, UserRole } from '@flex/shared';
import { api } from '../services/api';
import { telegramService } from '../services/telegram.service';
import { useStore } from './StoreContext';

interface AuthUser extends UserDTO {
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithTelegram: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { storeSlug } = useStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loginWithTelegram = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const initData = telegramService.getInitData();

      if (initData) {
        // Haqiqiy Telegram initData bilan avtorizatsiya
        const res = await api.post<{ token: string; user: AuthUser }>('/auth/telegram', {
          initData,
          storeSlug,
        });

        api.setToken(res.token);
        setToken(res.token);
        setUser(res.user);
      } else {
        // Brauzer orqali lokal ishlab chiqish (dev mode fallback)
        const tgUser = telegramService.getUser();
        if (tgUser) {
          setUser({
            id: tgUser.id,
            telegramId: tgUser.id,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name ?? null,
            username: tgUser.username ?? null,
            photoUrl: tgUser.photo_url ?? null,
            role: 'customer' as UserRole,
          });
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Telegram avtorizatsiya xatosi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loginWithTelegram();
  }, [storeSlug]);

  const logout = (): void => {
    api.setToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user || token),
        isLoading,
        loginWithTelegram,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
