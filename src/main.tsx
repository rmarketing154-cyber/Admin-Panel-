import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle unhandled rejections gracefully (e.g. Firebase Realtime DB permission latency)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (event.reason.message?.includes('PERMISSION_DENIED') || event.reason.code === 'PERMISSION_DENIED' || String(event.reason).includes('PERMISSION_DENIED'))) {
      console.warn('Suppressed Firebase permission latency warning:', event.reason);
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('PERMISSION_DENIED')) {
      console.warn('Suppressed Firebase permission error:', event.message);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


