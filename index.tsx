import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google'; // Novo import

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// O seu Client ID gerado no Google Cloud
const CLIENT_ID = "501648718670-u7pc1vj25rfudk3nfo4mnmvhc9tcgeud.apps.googleusercontent.com";

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* O Provider apenas fornece o contexto para o Google, não altera o App atual */}
    <GoogleOAuthProvider clientId={CLIENT_ID}> 
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// Atualiza sozinho quando sai versão nova: ao voltar para o app (e a cada 30 min),
// compara o pacote carregado com o publicado e recarrega se mudou.
(() => {
  const current = () => [...document.scripts].map((s) => s.src).find((s) => /\/assets\/index-[^/]+\.js$/.test(s))?.split('/').pop();
  const loaded = current();
  if (!loaded) return; // ambiente de desenvolvimento
  let checking = false;
  const check = async () => {
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      const html = await fetch('/', { cache: 'no-store' }).then((r) => r.text());
      const live = html.match(/assets\/(index-[^"']+\.js)/)?.[1];
      if (live && live !== loaded) window.location.reload();
    } catch { /* offline: tenta na próxima */ } finally { checking = false; }
  };
  document.addEventListener('visibilitychange', check);
  setInterval(check, 30 * 60e3);
})();
