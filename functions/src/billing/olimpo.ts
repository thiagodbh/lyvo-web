// Integração Olimpo Pay (gateway principal).
// Doc: https://api.olimpopay.com.br/docs/reference  (OpenAPI 3.0.3, versão 1.0.0)
//
// Como funciona:
// 1. Checkout: o servidor cria uma ASSINATURA (POST /v2/subscriptions/create) e devolve o
//    `paymentLink` hospedado pela Olimpo Pay (Pix/cartão). Nenhum dado de cartão passa pelo Lyvo.
// 2. Confirmação: a assinatura não aceita postBackUrl e o webhook da Olimpo não é assinado nem tem
//    retry. Por isso o acesso é decidido CONSULTANDO a API (GET /v2/subscriptions/me?id=)
//    — status, ultimo_pagamento, proxima_cobranca — a cada 15 min, quando o usuário clica
//    "já paguei" e quando chega qualquer webhook (que só serve de gatilho).

import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { processEvent } from "./engine";
import type { NormalizedEvent, Plan } from "./types";

export const OLIMPO_API_KEY = defineSecret("OLIMPO_API_KEY");
const BASE = "https://api.olimpopay.com.br";
const DAY = 864e5;
const db = () => admin.firestore();

export class OlimpoError extends Error {
  constructor(message: string, public status: number, public body: any) { super(message); }
}

type Fetcher = (url: string, init: any) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
let fetcher: Fetcher = (u, i) => fetch(u, i) as any;
/** só para testes */
export const __setFetcher = (f: Fetcher) => { fetcher = f; };

async function call(apiKey: string, method: "GET" | "POST", path: string, body?: any): Promise<any> {
  if (!apiKey) throw new OlimpoError("OLIMPO_API_KEY não configurada", 0, null);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetcher(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 500) }; }
    if (!res.ok) throw new OlimpoError(json?.message || `HTTP ${res.status}`, res.status, json);
    return json;
  } catch (e: any) {
    if (e instanceof OlimpoError) throw e;
    throw new OlimpoError(e?.name === "AbortError" ? "Tempo esgotado na Olimpo Pay" : String(e?.message || e), 0, null);
  } finally {
    clearTimeout(t);
  }
}

// ─── utilitários ────────────────────────────────────────────────────────────
export const onlyDigits = (s: any) => String(s || "").replace(/\D/g, "");

export function isValidCpf(v: string): boolean {
  const c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export function isValidCnpj(v: string): boolean {
  const c = onlyDigits(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (n: number) => {
    const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = w.reduce((acc, wi, i) => acc + Number(c[i]) * wi, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

/** Datas da Olimpo vêm como "2025-01-12 19:00:41" ou "2025-01-12". Assumimos horário de Brasília. */
export function parseOlimpoDate(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/);
  if (!m) { const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) { const d = new Date(s.replace(" ", "T")); return isNaN(d.getTime()) ? null : d; }
  const time = m[2] ? (m[2].length === 5 ? m[2] + ":00" : m[2]) : "12:00:00";
  const d = new Date(`${m[1]}T${time}-03:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function intervalFor(plan: Plan): { value: number; unit: "DAY" | "WEEK" | "MONTH" | "YEAR" } | null {
  switch (plan.interval) {
    case "month": return { value: 1, unit: "MONTH" };
    case "quarter": return { value: 3, unit: "MONTH" };
    case "semester": return { value: 6, unit: "MONTH" };
    case "year": return { value: 1, unit: "YEAR" };
    default: return null;
  }
}

// ─── API ────────────────────────────────────────────────────────────────────
export const ping = (apiKey: string) => call(apiKey, "GET", "/v1/accounts/balance/");

export async function getSubscription(apiKey: string, id: string | number) {
  const r = await call(apiKey, "GET", `/v2/subscriptions/me?id=${encodeURIComponent(String(id))}`);
  // a doc diz "objeto quando id informado"; aceitamos também envelopes { data: {...} } ou [ {...} ]
  const o = Array.isArray(r) ? r[0] : r?.data && !Array.isArray(r.data) && r.data.id !== undefined ? r.data : Array.isArray(r?.data) ? r.data[0] : r;
  return o || null;
}

export const getTransaction = (apiKey: string, transactionId: string) =>
  call(apiKey, "GET", `/v2/transactions/me/?transactionId=${encodeURIComponent(transactionId)}`);

export const cancelSubscription = (apiKey: string, id: string | number) =>
  call(apiKey, "POST", "/v2/subscriptions/cancel", { id: Number(id) });

export interface CheckoutInput {
  uid: string;
  plan: Plan;
  customer: { name: string; email: string; document: string; phone: string };
}

/** Cria a assinatura na Olimpo Pay e devolve o link de pagamento hospedado. */
export async function createCheckout(apiKey: string, input: CheckoutInput) {
  const { uid, plan, customer } = input;
  const interval = intervalFor(plan);
  if (!interval) throw new OlimpoError(`Plano ${plan.id} sem recorrência compatível`, 400, null);

  // evita criar várias assinaturas se o usuário clicar de novo: reaproveita link pendente < 24h do mesmo plano
  const existing = await db().collection("subscriptions")
    .where("uid", "==", uid).where("provider", "==", "olimpopay").get();
  const reuse = existing.docs.map((d) => d.data()).find((s) =>
    s.status === "waiting" && s.planId === plan.id && s.paymentLink &&
    (s.createdAt?.toMillis?.() || 0) > Date.now() - DAY);
  if (reuse) return { paymentLink: reuse.paymentLink as string, recorrenciaId: reuse.externalSubscriptionId as string, reused: true };

  const r = await call(apiKey, "POST", "/v2/subscriptions/create", {
    name: `Lyvo — ${plan.name}`,
    amount: Math.round(plan.price * 100) / 100,
    methods: ["PIX", "CREDIT_CARD"],
    dueInDays: 1,
    interval,
    customer: {
      name: customer.name,
      email: customer.email,
      document: onlyDigits(customer.document),
      phone: onlyDigits(customer.phone),
    },
  });

  const recorrenciaId = r?.recorrenciaId ?? r?.data?.recorrenciaId ?? r?.data?.id;
  const paymentLink = r?.paymentLink ?? r?.data?.paymentLink;
  if (!recorrenciaId || !paymentLink) throw new OlimpoError("Resposta da Olimpo Pay sem paymentLink/recorrenciaId", 502, r);

  await db().collection("subscriptions").doc(`olimpopay_${recorrenciaId}`).set({
    provider: "olimpopay",
    uid,
    email: customer.email.toLowerCase(),
    planId: plan.id,
    status: "waiting",
    externalSubscriptionId: String(recorrenciaId),
    paymentLink,
    paymentReference: r?.paymentReference ?? null,
    faturaId: r?.faturaId ?? null,
    lastAmount: plan.price,
    paymentsCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { paymentLink: paymentLink as string, recorrenciaId: String(recorrenciaId), reused: false };
}

// ─── sincronização (fonte da verdade do acesso) ─────────────────────────────
/** Traduz o estado atual da assinatura na Olimpo para eventos canônicos (idempotentes). */
export function eventsFromRemote(local: { externalSubscriptionId: string; email: string; paymentsCount?: number; lastRemotePayment?: string | null },
  remote: any, now = Date.now()): NormalizedEvent[] {
  const id = String(local.externalSubscriptionId);
  const status = String(remote?.status || "").toUpperCase();
  const last = remote?.ultimo_pagamento ? String(remote.ultimo_pagamento) : null;
  const next = parseOlimpoDate(remote?.proxima_cobranca);
  const email = String(remote?.cliente_email || local.email || "").toLowerCase() || null;
  const amount = remote?.valor !== undefined ? Number(remote.valor) : null;
  const base = {
    provider: "olimpopay" as const, email, amount: amount !== null && Number.isFinite(amount) ? amount : null,
    currency: "BRL", externalSubscriptionId: id, externalProductIds: [], isTest: false,
  };
  const out: NormalizedEvent[] = [];

  if (last && (status === "ACTIVE" || status === "CANCELLED" || status === "PAUSED")) {
    const paidAt = parseOlimpoDate(last) || new Date(now);
    const first = !local.paymentsCount && !local.lastRemotePayment;
    out.push({
      ...base,
      externalEventId: `olimpo_sub_${id}_paid_${last}`,
      rawType: `subscription:${status}:paid`,
      type: first ? "PAYMENT_APPROVED" : "PAYMENT_RENEWED",
      occurredAt: paidAt,
      periodEndHint: next,
    });
  }
  if (status === "ACTIVE" && next && next.getTime() < now - DAY && (!last || (parseOlimpoDate(last)?.getTime() || 0) < next.getTime())) {
    out.push({ ...base, amount: null, externalEventId: `olimpo_sub_${id}_late_${remote.proxima_cobranca}`, rawType: "subscription:ACTIVE:overdue", type: "RENEWAL_LATE", occurredAt: new Date(now) });
  }
  if (status === "CANCELLED" || status === "PAUSED") {
    out.push({ ...base, amount: null, externalEventId: `olimpo_sub_${id}_${status.toLowerCase()}`, rawType: `subscription:${status}`, type: "SUBSCRIPTION_CANCELED", occurredAt: new Date(now) });
  }
  return out;
}

export async function syncSubscriptionDoc(apiKey: string, ref: FirebaseFirestore.DocumentReference) {
  const local = (await ref.get()).data() as any;
  if (!local?.externalSubscriptionId) return { changed: false };
  const remote = await getSubscription(apiKey, local.externalSubscriptionId);
  if (!remote) return { changed: false };
  const events = eventsFromRemote(local, remote);
  const results = [];
  for (const ev of events) {
    results.push(await processEvent(ev, JSON.stringify(remote), { endpoint: "v2", forceUid: local.uid || undefined }));
  }
  const patch: any = {
    remoteStatus: remote.status || null,
    nextChargeAt: parseOlimpoDate(remote.proxima_cobranca) ? admin.firestore.Timestamp.fromDate(parseOlimpoDate(remote.proxima_cobranca)!) : null,
    lastRemotePayment: remote.ultimo_pagamento || null,
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const st = String(remote.status || "").toUpperCase();
  if (st === "WAITING" && (local.createdAt?.toMillis?.() || 0) < Date.now() - 7 * DAY && !remote.ultimo_pagamento) patch.status = "abandoned";
  await ref.set(patch, { merge: true });
  return { changed: results.some((r) => r.result === "applied"), results };
}

const SYNCABLE = ["waiting", "active", "past_due", "canceled"];

export async function syncWhere(apiKey: string, field: "uid" | "email" | null, value?: string) {
  let q: FirebaseFirestore.Query = db().collection("subscriptions").where("provider", "==", "olimpopay");
  if (field && value) q = q.where(field, "==", value);
  const snap = await q.get();
  let synced = 0; let changed = 0; const errors: string[] = [];
  for (const d of snap.docs) {
    const s = d.data();
    // canceladas só precisam de sync até o fim do período; abandonadas/expiradas não
    if (!SYNCABLE.includes(s.status)) continue;
    if (s.status === "canceled" && (s.currentPeriodEnd?.toMillis?.() || 0) < Date.now() - DAY) continue;
    try {
      const r = await syncSubscriptionDoc(apiKey, d.ref);
      synced++; if (r.changed) changed++;
    } catch (e: any) {
      errors.push(`${d.id}: ${e?.message || e}`);
    }
  }
  if (errors.length) {
    await db().collection("webhookErrors").add({ provider: "olimpopay", at: admin.firestore.FieldValue.serverTimestamp(), error: `sync: ${errors.slice(0, 5).join(" | ")}` });
  }
  return { synced, changed, errors: errors.length };
}

/**
 * Webhook da Olimpo (type "transaction"). Não é assinado nem tem retry, então:
 * nunca aplicamos acesso pelo conteúdo — só disparamos a sincronização do cliente
 * e, para estorno/chargeback, confirmamos pela API antes de cortar acesso.
 */
export async function handleWebhook(apiKey: string, body: any) {
  if (body?.type !== "transaction") return { handled: false, reason: `tipo ${body?.type || "?"}` };
  const email = String(body?.customer?.email || "").trim().toLowerCase();
  const status = String(body?.status || "").toLowerCase();
  let refund: string | null = null;

  if ((status === "refunded" || status === "chargeback") && body?.transaction_id) {
    try {
      const tx = await getTransaction(apiKey, String(body.transaction_id));
      const txStatus = String((Array.isArray(tx?.data) ? tx.data[0] : tx?.data || tx)?.status || "").toUpperCase();
      if (txStatus === "ESTORNADO") {
        const r = await processEvent({
          provider: "olimpopay", externalEventId: `olimpo_tx_${body.transaction_id}_${status}`, rawType: `transaction:${status}`,
          type: status === "chargeback" ? "CHARGEBACK" : "REFUNDED", email: email || null,
          amount: Number(body.total_price) || null, currency: "BRL", externalPaymentId: String(body.transaction_id),
          externalProductIds: [], occurredAt: parseOlimpoDate(body.refund_at || body.updated_at) || new Date(), isTest: false,
        }, JSON.stringify(body), { endpoint: "v2" });
        refund = r.result;
      } else {
        refund = `ignorado (API diz ${txStatus || "?"})`;
      }
    } catch (e: any) {
      refund = `erro ao confirmar: ${e?.message || e}`;
    }
  }
  const sync = email ? await syncWhere(apiKey, "email", email) : { synced: 0, changed: 0, errors: 0 };
  return { handled: true, refund, ...sync };
}
