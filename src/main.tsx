import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initializeInfrastructure } from './core/bootstrap';
import './index.css';

// Composition Root: register all infrastructure services before the App renders.
// Fails fast at startup if any mandatory service registration is missing.
initializeInfrastructure();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

