import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ui/error-boundary';
import { ToastContainer } from './components/ui/toast-container';
import './index.css';

// Initialize theme store early so dark mode class is applied before first paint
import './store/theme-store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
