// Checkout único do Lyvo: usado no paywall, no perfil (durante o teste) e a partir da landing.
// Planos, preços e gateways vêm de config/billing (editados no admin → Planos/Gateways).
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "../services/firebase";

export type ProviderId = "olimpopay" | "lastlink" | "kiwify" | "hotmart" | "cakto";
export type PaywallPlan = {
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
export type BillingConfig = {
  plans: PaywallPlan[];
  providerOrder: ProviderId[];
  providers: Record<string, { enabled: boolean; mode?: "api" | "link" }>;
  trialDays?: number;
};

// Usado se config/billing ainda não existir (ou não carregar): Olimpo Pay principal, LastLink de reserva
export const FALLBACK_BILLING: BillingConfig = {
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
  trialDays: 3,
};

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const PER: Record<string, string> = { month: "/ mês", quarter: "/ trimestre", semester: "/ semestre", year: "/ ano", lifetime: "" };
const OLIMPO_INTERVALS = ["month", "quarter", "semester", "year"];
export const CHECKOUT_FLAG = "lyvo_checkout_started";
const INTENT_KEY = "lyvo_plan_intent";

export type Route = { provider: ProviderId; url?: string };

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

export async function loadBillingConfig(): Promise<BillingConfig> {
  try {
    const s = await getDoc(doc(db, "config", "billing"));
    if (s.exists() && Array.isArray(s.data().plans)) return { ...FALLBACK_BILLING, ...(s.data() as BillingConfig) };
  } catch { /* usa o padrão */ }
  return FALLBACK_BILLING;
}

export function useBillingConfig() {
  const [cfg, setCfg] = useState<BillingConfig>(FALLBACK_BILLING);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { loadBillingConfig().then((c) => { setCfg(c); setLoaded(true); }); }, []);
  return { cfg, loaded };
}

export const visiblePlans = (cfg: BillingConfig) =>
  cfg.plans.filter((p) => p.active && routesFor(cfg, p).length).sort((a, b) => Number(!!b.highlight) - Number(!!a.highlight));

/** Intenção de compra vinda da landing ou de link (?assinar=1 / ?plano=annual): sobrevive ao cadastro/login. */
export function setPlanIntent(planId: string) { try { sessionStorage.setItem(INTENT_KEY, planId || "any"); } catch { /* */ } }
export function takePlanIntent(): string | null {
  let v: string | null = null;
  try { v = sessionStorage.getItem(INTENT_KEY); sessionStorage.removeItem(INTENT_KEY); } catch { /* */ }
  const q = new URLSearchParams(window.location.search);
  if (!v && (q.get("assinar") || q.get("plano"))) v = q.get("plano") || "any";
  if (q.has("assinar") || q.has("plano")) {
    // limpa o link para não reabrir ao recarregar
    q.delete("assinar"); q.delete("plano");
    try { window.history.replaceState(null, "", window.location.pathname + (q.toString() ? `?${q}` : "") + window.location.hash); } catch { /* */ }
  }
  return v;
}

/** Confere o pagamento na Olimpo Pay. Retorna true se o acesso pago já foi liberado. */
export async function verifyPayment(): Promise<boolean> {
  const r: any = (await httpsCallable(getFunctions(), "olimpoSyncMine")({})).data;
  return !!r?.hasAccess;
}

/** Confere na Olimpo e diz se a conta virou ASSINANTE (no trial, hasAccess já é true e não serve). */
export async function verifyPaid(): Promise<boolean> {
  await httpsCallable(getFunctions(), "olimpoSyncMine")({});
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const a: any = (await getDoc(doc(db, "users", uid))).data()?.access;
  const end = a?.currentPeriodEnd?.toMillis ? a.currentPeriodEnd.toMillis() : Number(a?.currentPeriodEnd || 0);
  return !!a && ["active", "past_due", "courtesy"].includes(a.status) && (!end || end > Date.now());
}

const startedAt = (): number => { try { return Number(sessionStorage.getItem(CHECKOUT_FLAG) || 0); } catch { return 0; } };
const clearStarted = () => { try { sessionStorage.removeItem(CHECKOUT_FLAG); } catch { /* */ } };

/** Quem voltou do pagamento (na mesma aba ou trocando de aba) tem a assinatura conferida sozinha. */
export function usePendingCheckoutWatcher(enabled: boolean, onPaid: () => void) {
  useEffect(() => {
    if (!enabled) return;
    let busy = false;
    const check = async () => {
      const t = startedAt();
      if (!t || busy || document.visibilityState !== "visible") return;
      if (Date.now() - t > 3 * 3600e3) { clearStarted(); return; }
      busy = true;
      try { if (await verifyPaid()) { clearStarted(); onPaid(); } } catch { /* tenta de novo na próxima volta */ } finally { busy = false; }
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
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

export function useProfileBasics() {
  const [profile, setProfile] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) getDoc(doc(db, "users", uid)).then((s) => {
      const d = s.data() || {};
      setProfile({ name: d.name || "", phone: d.phone || "" });
    }).catch(() => {});
  }, []);
  return profile;
}

/** Inicia a compra: Olimpo Pay (pede CPF) ou link do gateway, conforme a ordem configurada no admin. */
export function useStartCheckout(cfg: BillingConfig) {
  const [olimpoPlan, setOlimpoPlan] = useState<PaywallPlan | null>(null);
  const start = (plan: PaywallPlan) => {
    const [primary] = routesFor(cfg, plan);
    if (!primary) return;
    if (primary.provider === "olimpopay") { setOlimpoPlan(plan); return; }
    try { sessionStorage.setItem(CHECKOUT_FLAG, String(Date.now())); } catch { /* */ }
    window.open(primary.url, "_blank", "noopener,noreferrer");
  };
  return { start, olimpoPlan, closeOlimpo: () => setOlimpoPlan(null) };
}

export function OlimpoCheckoutModal({ plan, profile, fallback, onClose }: {
  plan: PaywallPlan; profile: { name: string; phone: string }; fallback: Route[]; onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState(maskPhone(profile.phone || ""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  // depois de abrir a Olimpo em outra aba, este modal vira a tela de espera que confere o pagamento sozinha
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [checking, setChecking] = useState(false);
  const [waitMsg, setWaitMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!payUrl || paid) return;
    let alive = true;
    const t0 = Date.now();
    const tick = async () => {
      if (!alive || document.visibilityState !== "visible") return;
      try { if (await verifyPaid()) { if (!alive) return; setPaid(true); clearStarted(); setTimeout(() => window.location.reload(), 1800); } } catch { /* */ }
    };
    const id = setInterval(() => { if (Date.now() - t0 > 20 * 60e3) clearInterval(id); else tick(); }, 6000);
    document.addEventListener("visibilitychange", tick);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [payUrl, paid]);

  const submit = async (e: any) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    // abre a aba já no clique (depois de um await o navegador bloqueia como pop-up)
    let win: Window | null = null;
    try { win = window.open("", "_blank"); } catch { /* */ }
    try {
      const r: any = (await httpsCallable(getFunctions(), "olimpoCheckout", { timeout: 30000 })({
        planId: plan.id, name, document: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, ""),
      })).data;
      try { sessionStorage.setItem(CHECKOUT_FLAG, String(Date.now())); } catch { /* */ }
      if (win && !win.closed) { win.location.href = r.url; setPayUrl(r.url); setBusy(false); }
      else window.location.href = r.url; // pop-up bloqueado: segue na mesma aba e confere na volta
    } catch (ex: any) {
      try { win?.close(); } catch { /* */ }
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-6 text-left shadow-2xl sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <img src="/brand/lyvo-icon-128.png" alt="" className="h-10 w-10 object-contain" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">{plan.name} · {brl(plan.price)} {PER[plan.interval] || ""}</h2>
            <p className="mt-0.5 text-sm text-gray-500">Pix ou cartão. Você será levado para a página segura da Olimpo Pay.</p>
          </div>
        </div>

        {payUrl ? (
          paid ? (
            <div className="space-y-2 rounded-xl bg-emerald-50 p-5 text-center">
              <div className="text-3xl">🎉</div>
              <p className="font-bold text-emerald-800">Pagamento confirmado!</p>
              <p className="text-sm text-emerald-700">Sua assinatura está ativa. Atualizando o Lyvo…</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                <span>Conclua o pagamento na aba da Olimpo Pay. Assim que ele cair, liberamos aqui sozinho. Pode voltar para esta aba.</span>
              </div>
              <a href={payUrl} target="_blank" rel="noreferrer" className="block w-full rounded-xl border border-gray-300 py-3 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50">
                Abrir a página de pagamento de novo
              </a>
              <button type="button" disabled={checking} onClick={async () => {
                  setChecking(true); setWaitMsg(null);
                  try {
                    if (await verifyPaid()) { setPaid(true); clearStarted(); setTimeout(() => window.location.reload(), 1800); }
                    else setWaitMsg("Ainda não caiu. Pix costuma levar segundos; cartão, alguns minutos.");
                  } catch { setWaitMsg("Não conseguimos conferir agora. Se você já pagou, o acesso é liberado em até 15 minutos."); }
                  finally { setChecking(false); }
                }}
                className="w-full rounded-xl bg-lyvo-primary py-3 font-bold text-white hover:bg-lyvo-dark disabled:opacity-60">
                {checking ? "Conferindo…" : "Já paguei"}
              </button>
              {waitMsg && <p className="text-center text-xs text-gray-500">{waitMsg}</p>}
            </div>
          )
        ) : fallbackUrl ? (
          <div className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p>Nosso pagamento principal está instável agora. Você pode concluir pelo checkout alternativo:</p>
            <a href={fallbackUrl} target="_blank" rel="noreferrer"
              onClick={() => { try { sessionStorage.setItem(CHECKOUT_FLAG, String(Date.now())); } catch { /* */ } }}
              className="block w-full rounded-xl bg-gray-900 py-3 text-center font-semibold text-white hover:bg-gray-800">
              Pagar pelo checkout alternativo
            </a>
            <p className="text-xs">Use o mesmo e-mail da sua conta para o acesso ser liberado automaticamente.</p>
          </div>
        ) : (<>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Nome completo</span>
            <input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-teal-600" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">CPF</span>
            <input required inputMode="numeric" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-teal-600" />
            <span className="mt-1 block text-xs text-gray-400">Exigido para emitir a cobrança. Não fica salvo no Lyvo.</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Celular</span>
            <input required inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" autoComplete="tel"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-teal-600" />
          </label>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-xl bg-lyvo-primary py-3.5 font-bold text-white hover:bg-lyvo-dark disabled:opacity-60">
            {busy ? "Gerando pagamento…" : "Ir para o pagamento"}
          </button>
        </>)}
        <button type="button" onClick={onClose} className="w-full text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
      </form>
    </div>
  );
}

/** Escolha de plano dentro do app (durante o teste): abre pelo Perfil, por ?assinar=1 ou vindo da landing. */
export function SubscribeModal({ onClose, preselect }: { onClose: () => void; preselect?: string | null }) {
  const { cfg } = useBillingConfig();
  const profile = useProfileBasics();
  const { start, olimpoPlan, closeOlimpo } = useStartCheckout(cfg);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const plans = visiblePlans(cfg);

  // veio da landing com um plano escolhido: já abre o pagamento desse plano
  useEffect(() => {
    if (!preselect || preselect === "any") return;
    const p = plans.find((x) => x.id === preselect);
    if (p) start(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, plans.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center gap-3">
          <img src="/brand/lyvo-icon-128.png" alt="" className="h-11 w-11 object-contain" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Assine o Lyvo</h2>
            <p className="text-sm text-gray-500">Seu histórico continua exatamente onde está.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200" aria-label="Fechar">✕</button>
        </div>
        <div className="space-y-3">
          {plans.map((plan) => (
            <button key={plan.id} onClick={() => start(plan)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition hover:shadow-md ${plan.highlight ? "border-lyvo-primary bg-teal-50/60" : "border-gray-200 bg-white"}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{plan.name}</span>
                  {plan.highlight && <span className="rounded-full bg-lyvo-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white">Melhor escolha</span>}
                </div>
                <div className="mt-0.5 text-sm text-gray-600">
                  <strong>{brl(plan.price)}</strong> {PER[plan.interval] || ""}
                  {plan.interval === "year" && <> · equivale a {brl(Math.floor((plan.price / 12) * 100) / 100)}/mês</>}
                </div>
                {plan.features?.[0] && <div className="mt-1 text-xs text-gray-500">{plan.features[0]}</div>}
              </div>
              <span className="text-lyvo-primary text-xl">→</span>
            </button>
          ))}
          {!plans.length && <p className="text-sm text-gray-500">Os planos estão temporariamente indisponíveis.</p>}
        </div>
        <div className="mt-5 rounded-2xl bg-gray-50 p-4">
          <button disabled={checking} onClick={async () => {
              setChecking(true); setMsg(null);
              try { if (await verifyPaid()) { clearStarted(); window.location.reload(); return; } setMsg("Ainda não identificamos o pagamento. Pix costuma cair em segundos; cartão em alguns minutos."); }
              catch { setMsg("Não conseguimos verificar agora. Se você já pagou, o acesso é liberado automaticamente em até 15 minutos."); }
              finally { setChecking(false); }
            }}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-60">
            {checking ? "Verificando…" : "Já paguei: verificar"}
          </button>
          {msg && <p className="mt-2 text-xs text-gray-500">{msg}</p>}
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">🔐 Pagamento processado pela Olimpo Pay. O Lyvo não armazena dados do seu cartão.</p>
      </div>
      {olimpoPlan && (
        <OlimpoCheckoutModal plan={olimpoPlan} profile={profile} fallback={routesFor(cfg, olimpoPlan).slice(1)} onClose={closeOlimpo} />
      )}
    </div>
  );
}
