type Props = {
  onLogout: () => void;
};

export default function Paywall({ onLogout }: Props) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        
        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Seu teste acabou. Continue no controle absoluto da sua vida.
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Você já sabe o quanto o LYVO facilita sua vida. Agora é hora de manter
            seu financeiro e sua agenda sob controle total, com previsibilidade real e sem estresse.
          </p>
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-6">
          {[
            "📊 Controle financeiro completo e organizado",
            "🧠 Previsibilidade total para fechar o mês com tranquilidade",
            "📅 Agenda integrada para sua vida pessoal e profissional",
            "🔒 Seus dados protegidos com segurança e privacidade",
            "⚡ Tudo em um só lugar: rápido, simples e inteligente",
            "🚀 O assistente digital mais completo para sua rotina",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-gray-700">
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Destaque Plano Anual */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3 mt-6">
          <div className="text-sm font-bold text-blue-600 uppercase">
            Melhor escolha 💙
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Plano Anual
          </h2>
          <p className="text-gray-700">
            Apenas <strong>R$149,90</strong> ou até <strong>5x de R$33,66</strong>
          </p>
          <p className="text-sm text-gray-600">
            Economize mais e tenha acesso completo ao LYVO o ano inteiro.
          </p>

          <a
            href="https://lastlink.com/p/CA05DE2CE/checkout-payment/"
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition"
          >
            Quero o Plano Anual (Recomendado)
          </a>
        </div>

        {/* Plano Mensal */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xl font-bold text-gray-900">
            Plano Mensal
          </h3>
          <p className="text-gray-700">
            Apenas <strong>R$24,90 / mês</strong>
          </p>
          <p className="text-sm text-gray-600">
            Cancele quando quiser. Sem fidelidade.
          </p>

          <a
            href="https://lastlink.com/p/CE5BD085C/checkout-payment/"
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
          >
            Assinar Mensal
          </a>
        </div>

        {/* Garantias */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>🔐 Seus dados são privados e protegidos</p>
          <p>✅ Sem fidelidade. Cancele quando quiser</p>
          <p>💡 Continue usando o app mais completo para controle da sua vida</p>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full text-gray-400 text-sm hover:text-gray-600 mt-4"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
