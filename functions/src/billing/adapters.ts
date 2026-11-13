// Adaptadores: traduzem o payload de cada gateway para o NormalizedEvent.
// LastLink: baseado na documentação oficial (support.lastlink.com, artigo 12587805).
// Kiwify/Hotmart/Cakto: baseado em referências públicas parciais — por isso cada um começa
// com `validated: false` no config e o admin mostra o payload bruto para conferência.

import * as crypto from "crypto";
import type { CanonicalType, NormalizedEvent, PlanInterval, ProviderId } from "./types";

type Any = Record<string, any>;

const get = (o: any, path: string): any =>
  path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), o);

const first = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== "");

const num = (v: any): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const toDate = (v: any): Date => {
  if (!v) return new Date();
  const s = String(v);
  // LastLink manda "YYYY-MM-DDTHH:mm:ss" em UTC sem o "Z"
  const d = new Date(/T\d{2}:\d{2}(:\d{2})?$/.test(s) ? s + "Z" : s);
  return isNaN(d.getTime()) ? new Date() : d;
};

const normEmail = (v: any): string | null => {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s.includes("@") ? s : null;
};

const monthsToInterval = (m: any): PlanInterval | null => {
  const n = num(m);
  if (n === 1) return "month";
  if (n === 3) return "quarter";
  if (n === 6) return "semester";
  if (n === 12) return "year";
  return null;
};

const ids = (...vals: any[]): string[] =>
  Array.from(new Set(vals.flat().filter((v) => typeof v === "string" && v.length > 0)));

const safeEqual = (a: string, b: string) => {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

export interface AdapterInput {
  body: Any;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, any>;
  rawBody?: Buffer;
}

export interface Adapter {
  id: ProviderId;
  normalize(input: AdapterInput): NormalizedEvent | null;
  /** validação nativa do gateway (opcional). O token na URL vale para todos. */
  verifyNative?(input: AdapterInput, nativeSecret: string): boolean;
}

// ─── LastLink ────────────────────────────────────────────────────────────────
const LASTLINK_MAP: Record<string, CanonicalType> = {
  Purchase_Order_Confirmed: "PAYMENT_APPROVED",
  Recurrent_Payment: "PAYMENT_RENEWED",
  Purchase_Request_Confirmed: "PAYMENT_PENDING",
  Purchase_Request_Canceled: "PAYMENT_FAILED",
  Purchase_Request_Expired: "PAYMENT_FAILED",
  Subscription_Renewal_Pending: "RENEWAL_LATE",
  Subscription_Canceled: "SUBSCRIPTION_CANCELED",
  Subscription_Expired: "SUBSCRIPTION_EXPIRED",
  Payment_Refund: "REFUNDED",
  Payment_Chargeback: "CHARGEBACK",
};

const lastlink: Adapter = {
  id: "lastlink",
  normalize({ body }) {
    // Formato antigo que o código atual esperava: { status, customer: { email } }
    if (!body.Event && (body.status || body.customer)) {
      const st = String(body.status || "").toLowerCase();
      return {
        provider: "lastlink",
        externalEventId: `legacy_${st}_${normEmail(body.customer?.email)}_${Date.now()}`,
        rawType: `legacy:${st}`,
        type: st === "approved" || st === "active" ? "PAYMENT_APPROVED" : "IGNORED",
        email: normEmail(body.customer?.email),
        amount: null,
        currency: "BRL",
        externalProductIds: [],
        occurredAt: new Date(),
        isTest: false,
      };
    }

    const D: Any = body.Data || {};
    const rawType = String(body.Event || "");
    let type: CanonicalType = LASTLINK_MAP[rawType] || "IGNORED";
    const recurrenceNumber = num(get(D, "Purchase.RecurrenceNumber"));
    if (type === "PAYMENT_APPROVED" && recurrenceNumber !== null && recurrenceNumber > 1) {
      type = "PAYMENT_RENEWED";
    }
    const subs: Any[] = Array.isArray(D.Subscriptions) ? D.Subscriptions : [];
    const products: Any[] = Array.isArray(D.Products) ? D.Products : [];

    return {
      provider: "lastlink",
      externalEventId: String(body.Id || `${rawType}_${get(D, "Purchase.PaymentId") || Date.now()}`),
      rawType,
      type,
      email: normEmail(first(get(D, "Buyer.Email"), get(D, "Member.Email"))),
      name: first(get(D, "Buyer.Name")) ?? null,
      phone: first(get(D, "Buyer.PhoneNumber")) ?? null,
      amount: num(first(get(D, "Purchase.Price.Value"), get(D, "Plan.Amount"))),
      currency: "BRL",
      externalPaymentId: first(get(D, "Purchase.PaymentId")) ?? null,
      externalSubscriptionId: first(subs[0]?.Id, D.SubscriptionId, get(D, "Subscription.Id")) ?? null,
      externalProductIds: ids(
        products.map((p) => p?.Id),
        get(D, "Offer.Id"),
        get(D, "Plan.Id"),
        get(D, "Product.Id"),
        subs.map((s) => s?.ProductId),
      ),
      intervalHint: monthsToInterval(first(get(D, "Purchase.Recurrency"), get(D, "Plan.Recurrency"))),
      occurredAt: toDate(first(get(D, "Purchase.PaymentDate"), body.CreatedAt)),
      isTest: body.IsTest === true,
      paymentMethod: first(get(D, "Purchase.Payment.PaymentMethod")) ?? null,
      utm: D.Utm || null,
    };
  },
};

// ─── Kiwify (a validar) ──────────────────────────────────────────────────────
const KIWIFY_MAP: Record<string, CanonicalType> = {
  order_approved: "PAYMENT_APPROVED",
  subscription_renewed: "PAYMENT_RENEWED",
  billet_created: "PAYMENT_PENDING",
  pix_created: "PAYMENT_PENDING",
  order_rejected: "PAYMENT_FAILED",
  subscription_late: "RENEWAL_LATE",
  subscription_canceled: "SUBSCRIPTION_CANCELED",
  order_refunded: "REFUNDED",
  chargeback: "CHARGEBACK",
};
const KIWIFY_STATUS: Record<string, CanonicalType> = {
  paid: "PAYMENT_APPROVED",
  refunded: "REFUNDED",
  chargedback: "CHARGEBACK",
  waiting_payment: "PAYMENT_PENDING",
  refused: "PAYMENT_FAILED",
};
const kiwifyFreq = (f: any): PlanInterval | null =>
  ({ monthly: "month", quarterly: "quarter", semiannually: "semester", yearly: "year", annually: "year" } as Record<string, PlanInterval>)[String(f || "").toLowerCase()] || null;

const kiwify: Adapter = {
  id: "kiwify",
  normalize({ body }) {
    const rawType = String(first(body.webhook_event_type, body.order_status) || "");
    const type = KIWIFY_MAP[rawType] || KIWIFY_STATUS[String(body.order_status || "")] || "IGNORED";
    const cents = num(get(body, "Commissions.charge_amount"));
    return {
      provider: "kiwify",
      externalEventId: `${body.order_id || "noid"}_${rawType}_${first(body.updated_at, body.approved_date, "") || ""}`,
      rawType,
      type,
      email: normEmail(get(body, "Customer.email")),
      name: get(body, "Customer.full_name") ?? null,
      phone: get(body, "Customer.mobile") ?? null,
      amount: cents !== null ? cents / 100 : null,
      currency: "BRL",
      externalPaymentId: body.order_id ?? null,
      externalSubscriptionId: first(body.subscription_id, get(body, "Subscription.id")) ?? null,
      externalProductIds: ids(get(body, "Product.product_id"), get(body, "Subscription.plan.id")),
      intervalHint: kiwifyFreq(get(body, "Subscription.plan.frequency")),
      occurredAt: toDate(first(body.approved_date, body.updated_at, body.created_at)),
      isTest: false,
      paymentMethod: body.payment_method ?? null,
      utm: body.TrackingParameters || null,
    };
  },
  verifyNative({ query, rawBody }, secret) {
    const sig = String(query.signature || "");
    if (!sig || !rawBody) return false;
    const expected = crypto.createHmac("sha1", secret).update(rawBody).digest("hex");
    return safeEqual(sig, expected);
  },
};

// ─── Hotmart (a validar) ─────────────────────────────────────────────────────
const HOTMART_MAP: Record<string, CanonicalType> = {
  PURCHASE_APPROVED: "PAYMENT_APPROVED",
  PURCHASE_COMPLETE: "IGNORED", // chega depois do APPROVED; ignorar evita contar receita 2x
  PURCHASE_BILLET_PRINTED: "PAYMENT_PENDING",
  PURCHASE_CANCELED: "PAYMENT_FAILED",
  PURCHASE_EXPIRED: "PAYMENT_FAILED",
  PURCHASE_DELAYED: "RENEWAL_LATE",
  PURCHASE_REFUNDED: "REFUNDED",
  PURCHASE_CHARGEBACK: "CHARGEBACK",
  PURCHASE_PROTEST: "CHARGEBACK",
  SUBSCRIPTION_CANCELLATION: "SUBSCRIPTION_CANCELED",
};

const hotmart: Adapter = {
  id: "hotmart",
  normalize({ body }) {
    const D: Any = body.data || {};
    const rawType = String(body.event || "");
    let type = HOTMART_MAP[rawType] || "IGNORED";
    const rec = num(get(D, "purchase.recurrence_number"));
    if (type === "PAYMENT_APPROVED" && rec !== null && rec > 1) type = "PAYMENT_RENEWED";
    return {
      provider: "hotmart",
      externalEventId: String(body.id || `${rawType}_${get(D, "purchase.transaction")}`),
      rawType,
      type,
      email: normEmail(first(get(D, "buyer.email"), get(D, "subscriber.email"))),
      name: get(D, "buyer.name") ?? null,
      phone: get(D, "buyer.checkout_phone") ?? null,
      amount: num(get(D, "purchase.price.value")),
      currency: String(get(D, "purchase.price.currency_value") || "BRL"),
      externalPaymentId: get(D, "purchase.transaction") ?? null,
      externalSubscriptionId: first(get(D, "subscription.subscriber.code"), get(D, "subscriber.code")) ?? null,
      externalProductIds: ids(String(get(D, "product.id") ?? ""), String(get(D, "subscription.plan.id") ?? "")),
      intervalHint: null,
      occurredAt: toDate(first(get(D, "purchase.approved_date"), body.creation_date)),
      isTest: false,
      paymentMethod: get(D, "purchase.payment.type") ?? null,
    };
  },
  verifyNative({ headers }, secret) {
    const h = headers["x-hotmart-hottok"];
    return typeof h === "string" && safeEqual(h, secret);
  },
};

// ─── Cakto (a validar) ───────────────────────────────────────────────────────
const CAKTO_MAP: Record<string, CanonicalType> = {
  purchase_approved: "PAYMENT_APPROVED",
  subscription_renewed: "PAYMENT_RENEWED",
  subscription_late_recovered: "PAYMENT_RENEWED",
  pix_gerado: "PAYMENT_PENDING",
  boleto_gerado: "PAYMENT_PENDING",
  purchase_refused: "PAYMENT_FAILED",
  pix_expirado: "PAYMENT_FAILED",
  subscription_late: "RENEWAL_LATE",
  subscription_renewal_refused: "RENEWAL_LATE",
  subscription_canceled: "SUBSCRIPTION_CANCELED",
  refund: "REFUNDED",
  chargeback: "CHARGEBACK",
};

const cakto: Adapter = {
  id: "cakto",
  normalize({ body }) {
    const D: Any = body.data || {};
    const rawType = String(body.event || "");
    return {
      provider: "cakto",
      externalEventId: `${D.id || "noid"}_${rawType}`,
      rawType,
      type: CAKTO_MAP[rawType] || "IGNORED",
      email: normEmail(get(D, "customer.email")),
      name: get(D, "customer.name") ?? null,
      phone: get(D, "customer.phone") ?? null,
      amount: num(first(D.amount, get(D, "offer.price"))),
      currency: "BRL",
      externalPaymentId: D.id ?? null,
      externalSubscriptionId: get(D, "subscription.id") ?? null,
      externalProductIds: ids(get(D, "product.id"), get(D, "offer.id")),
      intervalHint: null,
      occurredAt: toDate(first(D.paidAt, D.createdAt)),
      isTest: false,
      paymentMethod: D.paymentMethod ?? null,
    };
  },
  verifyNative({ body }, secret) {
    return typeof body.secret === "string" && safeEqual(body.secret, secret);
  },
};

// ─── Olimpo Pay ──────────────────────────────────────────────────────────────
// O webhook da Olimpo NÃO é usado para liberar acesso (não é assinado). Este adaptador existe só
// para o "Testar payload" do admin mostrar como o evento seria lido. O fluxo real está em olimpo.ts.
const OLIMPO_MAP: Record<string, CanonicalType> = {
  paid: "PAYMENT_APPROVED", waiting_payment: "PAYMENT_PENDING", refused: "PAYMENT_FAILED", failed: "PAYMENT_FAILED",
  refunded: "REFUNDED", chargeback: "CHARGEBACK",
};
const olimpopay: Adapter = {
  id: "olimpopay",
  normalize({ body }) {
    const rawType = `${body.type || "?"}:${body.status || "?"}`;
    return {
      provider: "olimpopay",
      externalEventId: `olimpo_tx_${body.transaction_id || "noid"}_${body.status || ""}`,
      rawType,
      type: body.type === "transaction" ? OLIMPO_MAP[String(body.status || "").toLowerCase()] || "IGNORED" : "IGNORED",
      email: normEmail(get(body, "customer.email")),
      name: get(body, "customer.name") ?? null,
      phone: get(body, "customer.phone") ?? null,
      amount: num(body.total_price),
      currency: "BRL",
      externalPaymentId: body.transaction_id ? String(body.transaction_id) : null,
      externalProductIds: [],
      occurredAt: toDate(first(body.updated_at, body.created_at)),
      isTest: false,
      paymentMethod: body.method ?? null,
      utm: body.utms || null,
    };
  },
};

export const ADAPTERS: Record<ProviderId, Adapter> = { olimpopay, lastlink, kiwify, hotmart, cakto };
