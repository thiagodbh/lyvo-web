type Props = {
  onLogout: () => void;
};

export default function Paywall({ onLogout }: Props) {
  const checkoutUrl = "https://lastlink.com/SEU-LINK-AQUI";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Top bar */}
        <div className="px-6 pt-7 pb-5 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
            Acesso encerrado
          </div>

          <h1 className="mt-4 text-2xl font-black text-gray-900 leading-tight">
            Seu teste acabou.
            <br />
            Assine para continuar com controle absoluto da sua vida!
          </h1>

          <p className="mt-3 text-gray-600 text-sm leading-relaxed">
            O Lyvo funciona como um <span className="font-semibold">chat estilo WhatsApp</span> que registra seus gastos,
            organiza finanças, agenda e rotinas com poucos comandos.
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
              O que você desbloqueia ao assinar
            </p>

            <ul className="mt-3 space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Chat inteligente</span> para registrar gastos/rotinas em segundos.
                </span>
              </li>

              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Finanças completas</span>: transações, contas fixas, cartões e previsões.
                </span>
              </li>

              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Agenda e compromissos</span> organizados, sem perder nada.
                </span>
              </li>

              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Tudo salvo e sincronizado</span> com segurança no seu usuário.
                </span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="mt-5 space-y-3">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition text-center shadow-lg shadow-blue-600/10"
            >
              Ativar acesso agora
            </a>

            <button
              onClick={onLogout}
              className="w-full py-3 rounded-2xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
            >
              Sair da conta
            </button>

            <p className="text-center text-[11px] text-gray-400">
              Você pode ativar a assinatura e entrar imediatamente sem perder seus dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
