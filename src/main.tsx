import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fontes auto-hospedadas (subsets latinos para pt-BR, zero FOUT, sem subsets cirílico/devanagari no bundle)
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-ext-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-ext-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-ext-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-ext-700.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-ext-400.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/latin-ext-700.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/playfair-display/latin-ext-400-italic.css';
import '@fontsource/dancing-script/latin-700.css';
import '@fontsource/dancing-script/latin-ext-700.css';

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
