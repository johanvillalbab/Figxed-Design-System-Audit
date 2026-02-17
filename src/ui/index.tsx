import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

function mount() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('Root container not found');
    return;
  }
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
