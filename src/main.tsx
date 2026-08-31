import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Handle unhandled rejections gracefully (e.g. WebSocket / Vite HMR closed, Firebase DB permission latency)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason?.message || event?.reason || '');
    if (
      reasonStr.includes('PERMISSION_DENIED') ||
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('vite') ||
      reasonStr.includes('Failed to fetch dynamically imported module')
    ) {
      console.warn('Suppressed benign background warning:', event.reason);
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event?.message || '');
    if (
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('WebSocket') ||
      msg.includes('vite') ||
      msg.includes('Failed to fetch dynamically imported module')
    ) {
      console.warn('Suppressed benign background error:', event.message);
      event.preventDefault();
    }
  });
}

// Fetch dynamic database config from server before importing Firebase and mounting
async function initAndMountApp() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const config = await res.json();
      if (config.databaseURL) {
        (window as any).FIREBASE_DATABASE_URL = config.databaseURL;
        console.log("Dynamically configured Firebase Database URL:", config.databaseURL);
      }
    }
  } catch (err) {
    console.error("Could not fetch runtime database URL from server:", err);
  }

  // Dynamically import App component so it loads with correct window.FIREBASE_DATABASE_URL in place
  let AppModule: any;
  try {
    AppModule = await import('./App');
  } catch (firstErr) {
    console.warn("First import('./App') failed, retrying in 300ms...", firstErr);
    await new Promise(r => setTimeout(r, 300));
    try {
      AppModule = await import('./App');
    } catch (secondErr) {
      console.warn("Second import('./App') failed, retrying in 800ms...", secondErr);
      await new Promise(r => setTimeout(r, 800));
      AppModule = await import('./App');
    }
  }

  const App = AppModule.default;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

initAndMountApp();


