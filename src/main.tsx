import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadStoredTheme, applyTheme } from './utils/theme';
import { sounds } from './utils/sound';
import './index.css';

// Initialize and apply stored theme immediately before render
applyTheme(loadStoredTheme().theme);

// Warm up Web Audio API on first user gesture for iOS Safari compatibility
sounds.initOnUserGesture();

// In AI Studio preview iframes, HMR WebSocket is disabled or proxied.
// Suppress WebSocket errors per environment guidelines.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    const stack = String(event.reason?.stack || '');
    if (
      msg.includes('WebSocket') ||
      msg.includes('vite:ws') ||
      stack.includes('@vite/client')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

