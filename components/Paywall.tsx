type Props = {
  onLogout: () => void;
};

export default function Paywall({ onLogout }: Props) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Acesso restrito</h1>

        <p className="text-gray-600">
          Seu acesso ainda não está ativo. Finalize a compra para liberar todas as funcionalidades do LYVO.
        </p>

        <a
          href="https://lastlink.com/SEU-LINK-AQUI"
          target="_blank"
          rel="noreferrer"
          className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Ativar acesso
        </a>

        <button
          onClick={onLogout}
          className="w-full text-gray-400 text-sm hover:text-gray-600"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
