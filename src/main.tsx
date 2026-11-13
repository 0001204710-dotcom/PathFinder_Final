import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.tsx'

// 1. Puxando os estilos principais da pasta styles
import './styles/tailwind.css'
import './styles/globals.css'
import './styles/index.css'

// 2. Puxando o tema do Shadcn que está na raiz do projeto
import '../default_shadcn_theme.css'

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return nativeFetch(input, { ...init, headers });
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)