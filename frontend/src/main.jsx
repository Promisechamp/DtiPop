import React from 'react';
import ReactDOM from 'react-dom/client';

import RootApp from './RootApp.jsx';

import { ThemeProvider } from './context/ThemeContext';
import GlobalThemeSync from './components/GlobalThemeSync';

import './index.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <GlobalThemeSync />
      <RootApp />
    </ThemeProvider>
  </React.StrictMode>
);