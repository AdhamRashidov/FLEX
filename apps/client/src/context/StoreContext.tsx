import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { StoreDTO } from '@flex/shared';
import { api } from '../services/api';
import { telegramService } from '../services/telegram.service';

interface StoreContextType {
  storeSlug: string;
  store: StoreDTO | null;
  isLoading: boolean;
  error: Error | null;
  setStoreSlug: (slug: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // 1. Slugni URL dan, start_param dan yoki zaxiradagi 'hosil-market' dan olish
  const [storeSlug, setStoreSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStore = urlParams.get('store') || urlParams.get('slug');
      if (urlStore) return urlStore;

      const tgParam = telegramService.getStartParam();
      if (tgParam) {
        // Agar start_param "store_slug" formatida kelsa:
        return tgParam.startsWith('store_') ? tgParam.replace('store_', '') : tgParam;
      }
    }
    return 'hosil-market';
  });

  // 2. Do'kon ma'lumotlarini serverdan yuklash
  const { data: store, isLoading, error } = useQuery<StoreDTO, Error>({
    queryKey: ['storeInfo', storeSlug],
    queryFn: () => api.get<StoreDTO>(`/shop/${storeSlug}/info`),
    staleTime: 5 * 60 * 1000, // 5 daqiqa
    retry: 2,
  });

  // Do'kon topilganda brauzer yoki WebApp sarlavhasini moslashtirish
  useEffect(() => {
    if (store?.name) {
      document.title = `${store.name} — FLEX`;
    }
  }, [store?.name]);

  const value = useMemo(
    () => ({
      storeSlug,
      store: store ?? null,
      isLoading,
      error: error ?? null,
      setStoreSlug,
    }),
    [storeSlug, store, isLoading, error]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
