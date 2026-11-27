import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './store.jsx';
import App from './App.jsx';
import './styles.css';
import './storefront/storefront.css';
import './storefront/phase3.css';
import './storefront/landing.css';
import './admin/phase3-admin.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider><App /></StoreProvider>
);
