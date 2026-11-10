import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { telegramService } from './services/telegram.service';

import { CatalogPage } from './pages/CatalogPage';
import { SearchPage } from './pages/SearchPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  useEffect(() => {
    // Telegram Mini App xizmatlarini ishga tushirish (ready, expand, theme sync)
    telegramService.init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                {/* 1. Katalog / Bosh sahifa */}
                <Route path="/" element={<CatalogPage />} />

                {/* 2. Mahsulot qidirish */}
                <Route path="/search" element={<SearchPage />} />

                {/* 3. Mahsulot tafsilotlari */}
                <Route path="/product/:id" element={<ProductDetailPage />} />

                {/* 4. Savat */}
                <Route path="/cart" element={<CartPage />} />

                {/* 5. Buyurtma rasmiylashtirish */}
                <Route path="/checkout" element={<CheckoutPage />} />

                {/* 6. Buyurtmalar tarixi */}
                <Route path="/orders" element={<OrdersPage />} />

                {/* 7. Buyurtma tafsilotlari va chek */}
                <Route path="/orders/:orderId" element={<OrderDetailPage />} />

                {/* Noma'lum marshrutlarni bosh sahifaga yo'naltirish */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
