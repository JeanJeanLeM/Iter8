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
  const payload = {
    sessionId: '97f800',
    runId: 'pre-fix',
    hypothesisId,
    location: 'client/src/main.jsx',
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  console.info('[agent-debug]', payload);
  // #endregion
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '97f800',
    },
    body: JSON.stringify(payload),
  }).catch((error) => {
    // #region agent log
    console.warn('[agent-debug] ingest failed', {
      location: 'client/src/main.jsx',
      message,
      hypothesisId,
      error: String(error?.message ?? error ?? 'unknown'),
    });
    // #endregion
  });
  // #endregion
};

const container = document.getElementById('root');
sendDebugLog('H0', 'bootstrap container lookup', { hasContainer: !!container });
const navEntry = performance.getEntriesByType('navigation')?.[0];
sendDebugLog('H6', 'navigation snapshot', {
  href: window.location.href,
  navType: navEntry?.type ?? null,
  redirectCount: navEntry?.redirectCount ?? null,
});

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

window.addEventListener('beforeunload', () => {
  sendDebugLog('H6', 'beforeunload fired', { href: window.location.href });
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
