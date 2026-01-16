import React from 'react';
import ReactDOM from 'react-dom/client';
import PasswordManager from '../password_manager';
import App from './components/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App>
      <PasswordManager />
    </App>
  </React.StrictMode>
);
