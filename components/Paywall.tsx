import React from 'react';

type Props = {
  onLogout: () => void;
};

export default function Paywall({ onLogout }: Props) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800">Seu período de teste terminou</h1>

        <p className="text-gray-600">
          Esperamos que o <strong>LYVO</strong> tenha ajudado sua produtividade nesses 7 dias! 
          Assine agora para manter o acesso ilimitado aos seus dados e ferramentas.
        </p>

        <a
          href="https://lastlink.com/SEU-LINK-AQUI" // <--- COLOQUE SEU LINK REAL AQUI
          target="_blank"
          rel="noreferrer"
          className="block w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          Assinar Agora (90% OFF)
        </a>

        <button
          onClick={onLogout}
          className="w-full text-gray-400 text-sm hover:text-gray-600 font-medium transition"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
