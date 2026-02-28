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
