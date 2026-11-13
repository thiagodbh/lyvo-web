import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "../services/firebase";

type Props = {
  onLogout: () => void;
};

type ProviderId = "olimpopay" | "lastlink" | "kiwify" | "hotmart" | "cakto";
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
  providers: Record<string, { enabled: boolean; mode?: "api" | "link" }>;
};

// Usado se config/billing ainda não existir: Olimpo Pay principal, LastLink de reserva
const FALLBACK: BillingConfig = {
  plans: [
    { id: "annual", name: "Plano Anual", price: 149.9, interval: "year", installmentsText: "ou até 5x no cartão", highlight: true, active: true,
      features: ["Economize mais e tenha acesso completo ao LYVO o ano inteiro."],
      checkout: { lastlink: "https://lastlink.com/p/CA05DE2CE/checkout-payment/" } },
    { id: "monthly", name: "Plano Mensal", price: 24.9, interval: "month", active: true,
      features: ["Cancele quando quiser. Sem fidelidade."],
      checkout: { lastlink: "https://lastlink.com/p/CE5BD085C/checkout-payment/" } },
  ],
  providerOrder: ["olimpopay", "lastlink"],
  providers: { olimpopay: { enabled: true, mode: "api" }, lastlink: { enabled: true, mode: "link" } },
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const per: Record<string, string> = { month: "/ mês", quarter: "/ trimestre", semester: "/ semestre", year: "/ ano", lifetime: "" };
const OLIMPO_INTERVALS = ["month", "quarter", "semester", "year"];
const CHECKOUT_FLAG = "lyvo_checkout_started";

type Route = { provider: ProviderId; url?: string };

/** Gateways que atendem o plano, em ordem de prioridade. O 1º é o principal; os demais são fallback. */
export function routesFor(cfg: BillingConfig, plan: PaywallPlan): Route[] {
  const out: Route[] = [];
  for (const p of cfg.providerOrder) {
    if (!cfg.providers[p]?.enabled) continue;
    if (p === "olimpopay") { if (OLIMPO_INTERVALS.includes(plan.interval)) out.push({ provider: p }); continue; }
    if (plan.checkout?.[p]) out.push({ provider: p, url: plan.checkout[p] });
  }
  return out;
}

const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.length > 10 ? d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
};

export default function Paywall({ onLogout }: Props) {
  const [cfg, setCfg] = useState<BillingConfig>(FALLBACK);
  const [profile, setProfile] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [checkoutPlan, setCheckoutPlan] = useState<PaywallPlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  useEffect(() => {
    getDoc(doc(db, "config", "billing"))
      .then((s) => { if (s.exists() && Array.isArray(s.data().plans)) setCfg(s.data() as BillingConfig); })
      .catch(() => { /* mantém fallback */ });
    const uid = auth.currentUser?.uid;
    if (uid) getDoc(doc(db, "users", uid)).then((s) => {
      const d = s.data() || {};
      setProfile({ name: d.name || "", phone: d.phone || "" });
    }).catch(() => {});
  }, []);

  /** Confere o pagamento na Olimpo e recarrega se o acesso foi liberado. */
  const verify = async (silent = false) => {
    setChecking(true); if (!silent) setCheckMsg(null);
    try {
      const r: any = (await httpsCallable(getFunctions(), "olimpoSyncMine")({})).data;
      if (r?.hasAccess) { try { sessionStorage.removeItem(CHECKOUT_FLAG); } catch { /* */ } window.location.reload(); return; }
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

  const plans = cfg.plans.filter((p) => p.active && routesFor(cfg, p).length)
    .sort((a, b) => Number(!!b.highlight) - Number(!!a.highlight));

  const start = (plan: PaywallPlan) => {
    const [primary] = routesFor(cfg, plan);
    if (!primary) return;
    if (primary.provider === "olimpopay") { setCheckoutPlan(plan); return; }
    window.open(primary.url, "_blank", "noopener,noreferrer");
  };

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

        {plans.map((plan) => plan.highlight ? (
          <div key={plan.id} className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3 mt-6">
            <div className="text-sm font-bold text-blue-600 uppercase">Melhor escolha 💙</div>
            <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
            <p className="text-gray-700">
              Apenas <strong>{brl(plan.price)}</strong> {per[plan.interval] || ""}
              {plan.installmentsText && routesFor(cfg, plan)[0]?.provider !== "olimpopay" ? <> · {plan.installmentsText}</> : null}
            </p>
            {plan.features?.map((f) => <p key={f} className="text-sm text-gray-600">{f}</p>)}
            <button onClick={() => start(plan)}
              className="block w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition">
              Quero o {plan.name} (Recomendado)
            </button>
          </div>
        ) : (
          <div key={plan.id} className="border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
            <p className="text-gray-700">Apenas <strong>{brl(plan.price)} {per[plan.interval] || ""}</strong></p>
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

      {checkoutPlan && (
        <OlimpoCheckoutModal plan={checkoutPlan} profile={profile} fallback={routesFor(cfg, checkoutPlan).slice(1)}
          onClose={() => setCheckoutPlan(null)} />
      )}
    </div>
  );
}

function OlimpoCheckoutModal({ plan, profile, fallback, onClose }: {
  plan: PaywallPlan; profile: { name: string; phone: string }; fallback: Route[]; onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState(maskPhone(profile.phone || ""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const submit = async (e: any) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r: any = (await httpsCallable(getFunctions(), "olimpoCheckout", { timeout: 30000 })({
        planId: plan.id, name, document: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, ""),
      })).data;
      try { sessionStorage.setItem(CHECKOUT_FLAG, String(Date.now())); } catch { /* */ }
      window.location.href = r.url;
    } catch (ex: any) {
      const code = String(ex?.code || "");
      if (code.endsWith("invalid-argument") || code.endsWith("resource-exhausted") || code.endsWith("permission-denied")) {
        setErr(ex?.message || "Confira os dados e tente novamente.");
      } else {
        // Olimpo indisponível → próximo gateway da lista (fallback)
        const next = fallback.find((r) => r.url);
        if (next?.url) setFallbackUrl(next.url);
        else setErr("Pagamento indisponível no momento. Tente novamente em alguns minutos.");
      }
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-6 text-left shadow-2xl sm:rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{plan.name} · {brl(plan.price)} {per[plan.interval] || ""}</h2>
          <p className="mt-1 text-sm text-gray-500">Pix ou cartão. Você será levado para a página segura da Olimpo Pay.</p>
        </div>

        {fallbackUrl ? (
          <div className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p>Nosso pagamento principal está instável agora. Você pode concluir pelo checkout alternativo:</p>
            <a href={fallbackUrl} target="_blank" rel="noreferrer"
              className="block w-full rounded-xl bg-gray-900 py-3 text-center font-semibold text-white hover:bg-gray-800">
              Pagar pelo checkout alternativo
            </a>
            <p className="text-xs">Use o mesmo e-mail da sua conta para o acesso ser liberado automaticamente.</p>
          </div>
        ) : (<>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Nome completo</span>
            <input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">CPF</span>
            <input required inputMode="numeric" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500" />
            <span className="mt-1 block text-xs text-gray-400">Exigido para emitir a cobrança. Não fica salvo no Lyvo.</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Celular</span>
            <input required inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" autoComplete="tel"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500" />
          </label>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? "Gerando pagamento…" : "Ir para o pagamento"}
          </button>
        </>)}
        <button type="button" onClick={onClose} className="w-full text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
      </form>
    </div>
  );
}
