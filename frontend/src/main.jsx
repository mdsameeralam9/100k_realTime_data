import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

// Configure the QueryClient with reasonable defaults for real-time data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is managed via WebSockets, so we consider it fresh
      // to avoid unnecessary background refetches
      staleTime: Infinity,
      // Do not refetch on window focus because the WebSocket handles updates
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Wrap the application to provide React Query context */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
