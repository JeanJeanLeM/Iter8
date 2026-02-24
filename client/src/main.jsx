import 'regenerator-runtime/runtime';
import { createRoot } from 'react-dom/client';
import './locales/i18n';
import App from './App';
import './style.css';
import './mobile.css';
import { ApiErrorBoundaryProvider } from './hooks/ApiErrorBoundaryContext';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/copy-tex.js';

const sendDebugLog = (hypothesisId, message, data = {}) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '97f800',
    },
    body: JSON.stringify({
      sessionId: '97f800',
      runId: 'pre-fix',
      hypothesisId,
      location: 'client/src/main.jsx',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
};

const container = document.getElementById('root');
sendDebugLog('H0', 'bootstrap container lookup', { hasContainer: !!container });

window.addEventListener('error', (event) => {
  sendDebugLog('H4', 'window error event', {
    message: event.message ?? null,
    filename: event.filename ?? null,
    lineno: event.lineno ?? null,
    colno: event.colno ?? null,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  sendDebugLog('H1', 'window unhandled rejection', {
    reason: String(event?.reason?.message ?? event?.reason ?? 'unknown'),
  });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      sendDebugLog('H2', 'service worker registration snapshot', {
        hasRegistration: !!registration,
        active: !!registration?.active,
        waiting: !!registration?.waiting,
        installing: !!registration?.installing,
        scope: registration?.scope ?? null,
      });
    })
    .catch(() => {});

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    sendDebugLog('H2', 'service worker controller change', {});
  });
}

const root = createRoot(container);

root.render(
  <ApiErrorBoundaryProvider>
    <App />
  </ApiErrorBoundaryProvider>,
);
