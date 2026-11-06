import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// In development preview mode, unregister any conflicting service worker to stop reload loops
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// In production or when deployed (e.g. Netlify/Cloud Run), activate full PWA service worker
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
  });
}

createRoot(document.getElementById('root')!).render(<App />);
