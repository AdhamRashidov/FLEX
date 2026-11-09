import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router';
import { CatalogPage } from './pages/catalog';

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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          {/* TODO: Qo'shimcha sahifalar */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
