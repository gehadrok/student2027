import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initializeInfrastructure } from './core/bootstrap';
import { getSQLiteDB } from './lib/sqlite-engine';
import './index.css';

async function bootstrap() {
  initializeInfrastructure();
  await getSQLiteDB();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap().catch((err) => {
  const root = document.getElementById('root');
  const msg = err instanceof Error ? (err.stack || err.message) : String(err);
  if (root) {
    root.innerHTML = '<pre style="color:#b91c1c;background:#fef2f2;padding:16px;white-space:pre-wrap;direction:ltr;text-align:left;font-family:monospace;">' + String(msg).replace(/</g, '&lt;') + '</pre>';
  }
});
