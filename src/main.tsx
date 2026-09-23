import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import analyse from './data/analyse.json';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Besøkstall uten informasjonskapsler (Cloudflare Web Analytics) – bare når token er satt.
if (import.meta.env.PROD && analyse.cloudflareToken) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token: analyse.cloudflareToken });
  document.head.append(s);
}

// Appen kan legges på hjemskjermen og virker uten nett når den først er åpnet.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
