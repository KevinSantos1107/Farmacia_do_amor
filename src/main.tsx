import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './app/App';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

// Suprime erros benignos de abort/cancelamento de requisições do console (ex: WebChannel / unmount)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isAbort =
      reason?.name === 'AbortError' ||
      (typeof reason?.message === 'string' &&
        (reason.message.includes('signal is aborted') ||
          reason.message.includes('Request was aborted')));
    if (isAbort) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
