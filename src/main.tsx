import React from 'react';
import ReactDOM from 'react-dom/client';
import PasswordManager from '../password_manager';
import App from './components/App';

const rootEl = document.getElementById('root') ?? (() => {
  const el = document.createElement('div');
  el.id = 'root';
  document.body.appendChild(el);
  return el;
})();

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App>
      <PasswordManager />
    </App>
  </React.StrictMode>
);
