import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

type Props = {
  onLogout: () => void;
};

type ProviderId = "lastlink" | "kiwify" | "hotmart" | "cakto";
type PaywallPlan = {
  id: string;
  name: string;
  price: number;
  interval: string;
  installmentsText?: string;
  highlight?: boolean;
  active: boolean;
  features?: string[];
  checkout: Partial<Record<ProviderId, string>>;
};
type BillingConfig = {
  plans: PaywallPlan[];
  providerOrder: ProviderId[];
  providers: Record<string, { enabled: boolean }>;
};

// Usado se config/billing ainda não existir (mesmo conteúdo de antes)
const FALLBACK: BillingConfig = {
  plans: [
    { id: "annual", name: "Plano Anual", price: 149.9, interval: "year", installmentsText: "ou até 5x no cartão", highlight: true, active: true,
      features: ["Economize mais e tenha acesso completo ao LYVO o ano inteiro."],
      checkout: { lastlink: "https://lastlink.com/p/CA05DE2CE/checkout-payment/" } },
    { id: "monthly", name: "Plano Mensal", price: 24.9, interval: "month", active: true,
      features: ["Cancele quando quiser. Sem fidelidade."],
      checkout: { lastlink: "https://lastlink.com/p/CE5BD085C/checkout-payment/" } },
  ],
  providerOrder: ["lastlink"],
  providers: { lastlink: { enabled: true } },
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const per: Record<string, string> = { month: "/ mês", quarter: "/ trimestre", semester: "/ semestre", year: "/ ano", lifetime: "" };

/** Primeiro gateway habilitado (na ordem de prioridade) que tem link para o plano. */
export function checkoutUrl(cfg: BillingConfig, plan: PaywallPlan): string | null {
  for (const p of cfg.providerOrder) {
    if (cfg.providers[p]?.enabled && plan.checkout?.[p]) return plan.checkout[p]!;
  }
  return null;
}

export default function Paywall({ onLogout }: Props) {
  const [cfg, setCfg] = useState<BillingConfig>(FALLBACK);

  useEffect(() => {
    getDoc(doc(db, "config", "billing"))
      .then((s) => { if (s.exists() && Array.isArray(s.data().plans)) setCfg(s.data() as BillingConfig); })
      .catch(() => { /* mantém fallback */ });
  }, []);

  const plans = cfg.plans.filter((p) => p.active && checkoutUrl(cfg, p))
    .sort((a, b) => Number(!!b.highlight) - Number(!!a.highlight));

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Seu teste acabou. Continue no controle absoluto da sua vida.
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Você já sabe o quanto o LYVO facilita sua vida. Agora é hora de manter
            seu financeiro e sua agenda sob controle total, com previsibilidade real e sem estresse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-6">
          {[
            "📊 Controle financeiro completo e organizado",
            "🧠 Previsibilidade total para fechar o mês com tranquilidade",
            "📅 Agenda integrada para sua vida pessoal e profissional",
            "🔒 Seus dados protegidos com segurança e privacidade",
            "⚡ Tudo em um só lugar: rápido, simples e inteligente",
            "🚀 O assistente digital mais completo para sua rotina",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-gray-700"><span>{item}</span></div>
          ))}
        </div>

        {plans.map((plan) => {
          const url = checkoutUrl(cfg, plan)!;
          return plan.highlight ? (
            <div key={plan.id} className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3 mt-6">
              <div className="text-sm font-bold text-blue-600 uppercase">Melhor escolha 💙</div>
              <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-gray-700">
                Apenas <strong>{brl(plan.price)}</strong> {per[plan.interval] || ""}
                {plan.installmentsText ? <> · {plan.installmentsText}</> : null}
              </p>
              {plan.features?.map((f) => <p key={f} className="text-sm text-gray-600">{f}</p>)}
              <a href={url} target="_blank" rel="noreferrer"
                className="block w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition">
                Quero o {plan.name} (Recomendado)
              </a>
            </div>
          ) : (
            <div key={plan.id} className="border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-gray-700">Apenas <strong>{brl(plan.price)} {per[plan.interval] || ""}</strong></p>
              {plan.features?.map((f) => <p key={f} className="text-sm text-gray-600">{f}</p>)}
              <a href={url} target="_blank" rel="noreferrer"
                className="block w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition">
                Assinar {plan.name.replace(/^Plano\s+/i, "")}
              </a>
            </div>
          );
        })}

        {plans.length === 0 && (
          <p className="text-sm text-gray-500">Os planos estão temporariamente indisponíveis. Tente novamente em alguns minutos.</p>
        )}

        <div className="text-sm text-gray-500 space-y-1">
          <p>🔐 Seus dados são privados e protegidos</p>
          <p>✅ Sem fidelidade. Cancele quando quiser</p>
          <p>💡 Use o mesmo e-mail da sua conta no pagamento para liberar o acesso automaticamente</p>
        </div>

        <button onClick={onLogout} className="w-full text-gray-400 text-sm hover:text-gray-600 mt-4">
          Sair da conta
        </button>
      </div>
    </div>
  );
}
