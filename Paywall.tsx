import React from 'react';

const Paywall = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white p-6 text-center">
      <h2 className=\"text-2xl font-bold text-gray-800\">Seu período de teste terminou</h2>
      <p className=\"text-gray-600 mt-4\">Esperamos que o Lyvo tenha ajudado sua produtividade nesses 7 dias!</p>
      <p className=\"text-gray-600 mb-8\">Assine agora para manter o acesso ilimitado aos seus dados.</p>
      
      <a 
        href=\"URL_DA_SUA_PAGINA_DE_VENDAS_LASTLINK\" 
        className=\"bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition w-full max-w-xs\"
      >
        Assinar Agora (90% OFF)
      </a>
    </div>
  );
};

export default Paywall;
