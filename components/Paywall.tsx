import { useEffect, useState } from "react";
import {
  CHECKOUT_FLAG, OlimpoCheckoutModal, PER, brl, routesFor, useBillingConfig, useProfileBasics, useStartCheckout,
  verifyPayment, visiblePlans,
} from "./Checkout";

type Props = {
  onLogout: () => void;
};

export default function Paywall({ onLogout }: Props) {
  const { cfg } = useBillingConfig();
  const profile = useProfileBasics();
  const { start, olimpoPlan, closeOlimpo } = useStartCheckout(cfg);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  /** Confere o pagamento e recarrega se o acesso foi liberado. */
  const verify = async (silent = false) => {
    setChecking(true); if (!silent) setCheckMsg(null);
    try {
      if (await verifyPayment()) { try { sessionStorage.removeItem(CHECKOUT_FLAG); } catch { /* */ } window.location.reload(); return; }
      if (!silent) setCheckMsg("Ainda não identificamos o pagamento. Pix costuma cair em segundos; cartão em até alguns minutos. Tente de novo em instantes.");
    } catch {
      if (!silent) setCheckMsg("Não conseguimos verificar agora. Se você já pagou, o acesso é liberado automaticamente em até 15 minutos.");
    } finally { setChecking(false); }
  };

  // voltou da página de pagamento: confere sozinho
  useEffect(() => {
    let started = false;
    try { started = !!sessionStorage.getItem(CHECKOUT_FLAG); } catch { /* */ }
    if (started) verify(true);
    const onVis = () => {
      let s = false; try { s = !!sessionStorage.getItem(CHECKOUT_FLAG); } catch { /* */ }
      if (document.visibilityState === "visible" && s) verify(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plans = visiblePlans(cfg);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">

        <img src="/brand/lyvo-logo.png" alt="Lyvo" className="mx-auto h-24 w-auto object-contain" />

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

        {plans.map((plan) => plan.highlight ? (
          <div key={plan.id} className="bg-teal-50 border border-teal-200 rounded-xl p-6 space-y-3 mt-6">
            <div className="text-sm font-bold text-lyvo-primary uppercase">Melhor escolha</div>
            <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
            <p className="text-gray-700">
              Apenas <strong>{brl(plan.price)}</strong> {PER[plan.interval] || ""}
              {plan.installmentsText && routesFor(cfg, plan)[0]?.provider !== "olimpopay" ? <> · {plan.installmentsText}</> : null}
            </p>
            {plan.features?.map((f) => <p key={f} className="text-sm text-gray-600">{f}</p>)}
            <button onClick={() => start(plan)}
              className="block w-full bg-lyvo-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-lyvo-dark transition">
              Quero o {plan.name} (Recomendado)
            </button>
          </div>
        ) : (
          <div key={plan.id} className="border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
            <p className="text-gray-700">Apenas <strong>{brl(plan.price)} {PER[plan.interval] || ""}</strong></p>
            {plan.features?.map((f) => <p key={f} className="text-sm text-gray-600">{f}</p>)}
            <button onClick={() => start(plan)}
              className="block w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition">
              Assinar {plan.name.replace(/^Plano\s+/i, "")}
            </button>
          </div>
        ))}

        {plans.length === 0 && (
          <p className="text-sm text-gray-500">Os planos estão temporariamente indisponíveis. Tente novamente em alguns minutos.</p>
        )}

        <div className="rounded-xl bg-gray-50 p-4 space-y-2">
          <p className="text-sm text-gray-600">Já pagou?</p>
          <button onClick={() => verify(false)} disabled={checking}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-60">
            {checking ? "Verificando…" : "Verificar meu pagamento"}
          </button>
          {checkMsg && <p className="text-xs text-gray-500">{checkMsg}</p>}
        </div>

        <div className="text-sm text-gray-500 space-y-1">
          <p>🔐 Pagamento processado pela Olimpo Pay. O Lyvo não armazena dados do seu cartão.</p>
          <p>✅ Sem fidelidade. Cancele quando quiser</p>
        </div>

        <button onClick={onLogout} className="w-full text-gray-400 text-sm hover:text-gray-600 mt-4">
          Sair da conta
        </button>
      </div>

      {olimpoPlan && (
        <OlimpoCheckoutModal plan={olimpoPlan} profile={profile} fallback={routesFor(cfg, olimpoPlan).slice(1)} onClose={closeOlimpo} />
      )}
    </div>
  );
}
