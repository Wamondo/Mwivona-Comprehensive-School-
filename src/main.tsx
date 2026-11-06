import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('PWA: New version available');
  },
  onOfflineReady() {
    console.log('PWA: Ready for offline operation');
  },
});

// Standard browser service worker registration check
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Fallback SW registration notice:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
