type Props = {
  onLogout: () => void;
};

export default function Paywall({ onLogout }: Props) {
  const annualUrl = "https://lastlink.com/p/CA05DE2CE/checkout-payment/";
  const monthlyUrl = "https://lastlink.com/p/CE5BD085C/checkout-payment/";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-7 pb-5 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black">
            Teste finalizado
          </div>

          <h1 className="mt-4 text-2xl font-black text-gray-900 leading-tight">
            Seu teste acabou.
            <br />
            Assine para continuar com controle absoluto da sua vida!
          </h1>

          <p className="mt-3 text-gray-600 text-sm leading-relaxed">
            Você já usou o Lyvo e sabe: ele funciona como um{" "}
            <span className="font-semibold">chat inteligente</span> que organiza
            suas finanças, agenda e rotinas em segundos. Agora é hora de{" "}
            <span className="font-semibold">não perder esse controle</span>.
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
              O que você garante ao continuar
            </p>

            <ul className="mt-3 space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Controle total das finanças</span>: transações, contas fixas, cartões e previsões.
                </span>
              </li>

              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Registro por chat</span>: anote gastos e ações em segundos, sem fricção.
                </span>
              </li>

              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Agenda organizada</span> para não esquecer compromissos e prazos.
                </span>
              </li>

              <li className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>
                  <span className="font-bold">Tudo salvo e seguro</span>, sincronizado com sua conta.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 mt-5 space-y-4">
          {/* Annual - Highlighted */}
          <div className="relative rounded-2xl border-2 border-blue-600 p-4 bg-blue-50">
            <div className="absolute -top-3 right-4 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full">
              MAIS VANTAJOSO
            </div>

            <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider">
              Plano Anual
            </h3>

            <p className="mt-1 text-2xl font-black text-blue-900">
              R$ 149,90 <span className="text-sm font-bold text-blue-700">/ ano</span>
            </p>

            <p className="mt-1 text-xs text-blue-800">
              Menos de R$ 12,50 por mês. Economize mais de 50% em relação ao mensal.
            </p>

            <a
              href={annualUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition text-center shadow-lg shadow-blue-600/20"
            >
              Assinar plano anual
            </a>
          </div>

          {/* Monthly */}
          <div className="rounded-2xl border border-gray-200 p-4 bg-white">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Plano Mensal
            </h3>

            <p className="mt-1 text-2xl font-black text-gray-900">
              R$ 24,90 <span className="text-sm font-bold text-gray-600">/ mês</span>
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Pagamento recorrente. Cancele quando quiser.
            </p>

            <a
              href={monthlyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block w-full bg-gray-900 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition text-center"
            >
              Assinar plano mensal
            </a>
          </div>

          {/* Footer actions */}
          <div className="pt-2 space-y-3">
            <button
              onClick={onLogout}
              className="w-full py-3 rounded-2xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
            >
              Sair da conta
            </button>

            <p className="text-center text-[11px] text-gray-400">
              Seus dados continuam salvos. Ao assinar, você volta exatamente de onde parou.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
