import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { analytics } from '@heycatch/sdk';

analytics.init({
  projectKey: 'hck_pk_lW5CDCmDS7hFEkv0RQm2_Xtq26wvPRGZ',
  install: {
    framework: 'vite-react',
    frameworkVersion: '18',
    agent: 'other',
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}