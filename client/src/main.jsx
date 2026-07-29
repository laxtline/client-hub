// main.jsx — the React entry point Vite loads from index.html. Mounts <App/> into
// the #root element and pulls in the global Tailwind styles.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
