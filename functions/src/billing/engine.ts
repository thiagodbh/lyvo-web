// Motor de cobrança: recebe um NormalizedEvent (de qualquer gateway) e aplica
// ledger + assinatura + acesso do usuário, de forma idempotente.

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {
  AccessStatus, BillingConfig, CanonicalType, DEFAULT_BILLING_CONFIG, INTERVAL_DAYS,
  NormalizedEvent, Plan, ProviderId,
} from "./types";

const db = () => admin.firestore();
const TS = admin.firestore.Timestamp;
const DAY = 864e5;

export interface Access {
  status: AccessStatus;
  planId?: string | null;
  provider?: ProviderId | "manual" | null;
  currentPeriodEnd?: FirebaseFirestore.Timestamp | null;
  graceUntil?: FirebaseFirestore.Timestamp | null;
  subscriptionId?: string | null;
  source: "payment" | "manual" | "trial";
  everPaid?: boolean;
  updatedAt?: unknown;
}

const PAID_STATUSES: AccessStatus[] = ["active", "past_due", "canceled", "courtesy"];

/** Regra única de "tem acesso?". O cliente usa uma cópia desta lógica. */
export function hasAccess(user: any, now = Date.now()): boolean {
  if (!user) return false;
  const a: Access | undefined = user.access;
  if (a?.status === "blocked" || user.blocked === true) return false;
  if (a && PAID_STATUSES.includes(a.status)) {
    const end = Math.max(a.currentPeriodEnd?.toMillis?.() ?? 0, a.graceUntil?.toMillis?.() ?? 0);
    if (!a.currentPeriodEnd && a.status !== "canceled") return true; // sem prazo = indeterminado
    return end > now;
  }
  if (!a && user.active === true) return true; // usuários antigos ativados pelo webhook velho
  const trialEnd = user.trialEndsAt?.toMillis?.() ?? (typeof user.trialEndsAt === "number" ? user.trialEndsAt : 0);
  return trialEnd > now;
}

export async function getBillingConfig(): Promise<BillingConfig> {
  const snap = await db().doc("config/billing").get();
  if (!snap.exists) return DEFAULT_BILLING_CONFIG;
  const c = snap.data() as Partial<BillingConfig>;
  return {
    ...DEFAULT_BILLING_CONFIG,
    ...c,
    providers: { ...DEFAULT_BILLING_CONFIG.providers, ...(c.providers || {}) },
    // gateways novos que ainda não estão na ordem salva entram no fim (não mudam o principal sem querer)
    providerOrder: [...(c.providerOrder || []), ...DEFAULT_BILLING_CONFIG.providerOrder.filter((p) => !(c.providerOrder || []).includes(p))],
  } as BillingConfig;
}

export function resolvePlan(cfg: BillingConfig, ev: NormalizedEvent): Plan | null {
  const byId = cfg.plans.find((p) =>
    (p.externalIds?.[ev.provider] || []).some((id) => ev.externalProductIds.includes(id)));
  if (byId) return byId;
  if (ev.intervalHint) {
    const byInterval = cfg.plans.find((p) => p.interval === ev.intervalHint);
    if (byInterval) return byInterval;
  }
  if (ev.amount !== null) {
    // último recurso: plano de preço mais próximo (tolerância 20% p/ cupom/juros de parcelamento)
    const best = [...cfg.plans].sort((a, b) => Math.abs(a.price - ev.amount!) - Math.abs(b.price - ev.amount!))[0];
    if (best && Math.abs(best.price - ev.amount) / best.price <= 0.2) return best;
  }
  return null;
}

export async function findUidByEmail(email: string | null): Promise<string | null> {
  if (!email) return null;
  try {
    return (await admin.auth().getUserByEmail(email)).uid;
  } catch {
    const q = await db().collection("users").where("email", "==", email).limit(1).get();
    return q.empty ? null : q.docs[0].id;
  }
}

const REVENUE_SIGN: Partial<Record<CanonicalType, number>> = {
  PAYMENT_APPROVED: 1, PAYMENT_RENEWED: 1, REFUNDED: -1, CHARGEBACK: -1,
};

/** Calcula o novo acesso a partir do atual + evento. null = não muda nada. */
export function nextAccess(
  current: Access | undefined, ev: NormalizedEvent, plan: Plan | null, cfg: BillingConfig,
): Access | null {
  const now = Date.now();
  const base: Access = {
    status: current?.status || "trial",
    planId: plan?.id ?? current?.planId ?? null,
    provider: ev.provider,
    currentPeriodEnd: current?.currentPeriodEnd ?? null,
    graceUntil: null,
    subscriptionId: ev.externalSubscriptionId ?? current?.subscriptionId ?? null,
    source: "payment",
    everPaid: current?.everPaid || false,
  };
  if (current?.status === "blocked") return null; // bloqueio manual prevalece

  switch (ev.type) {
    case "PAYMENT_APPROVED":
    case "PAYMENT_RENEWED": {
      const interval = plan?.interval || ev.intervalHint || "month";
      const from = Math.max(ev.occurredAt.getTime(), now - 2 * DAY);
      // Olimpo Pay informa a próxima cobrança: acesso vai até ela (+1 dia de folga para o pagamento cair)
      const end = ev.periodEndHint && ev.periodEndHint.getTime() > now
        ? ev.periodEndHint.getTime() + DAY
        : from + INTERVAL_DAYS[interval] * DAY;
      return { ...base, status: "active", everPaid: true, currentPeriodEnd: TS.fromMillis(end) };
    }
    case "RENEWAL_LATE": {
      const end = current?.currentPeriodEnd?.toMillis?.() ?? now;
      return { ...base, status: "past_due", graceUntil: TS.fromMillis(Math.max(end, now) + cfg.graceDays * DAY) };
    }
    case "SUBSCRIPTION_CANCELED":
      return { ...base, status: "canceled" }; // mantém até o fim do período pago
    case "SUBSCRIPTION_EXPIRED":
      return { ...base, status: "expired", currentPeriodEnd: TS.fromMillis(now) };
    case "REFUNDED":
    case "CHARGEBACK":
      return { ...base, status: "refunded", currentPeriodEnd: TS.fromMillis(now) };
    default:
      return null;
  }
}

/** Campos legados que o app atual ainda lê (active/plan). */
export function legacyMirror(access: Access) {
  return {
    active: hasAccess({ access }),
    plan: access.planId || (access.status === "trial" ? "trial" : access.status),
  };
}

export type ProcessResult =
  | "applied" | "pending_user" | "no_change" | "duplicate" | "test" | "unmatched_plan";

export async function processEvent(
  ev: NormalizedEvent,
  rawJson: string,
  meta: { endpoint: "v2" | "legacy"; forceUid?: string },
): Promise<{ id: string; result: ProcessResult }> {
  const cfg = await getBillingConfig();
  const id = `${ev.provider}_${crypto.createHash("sha1").update(ev.externalEventId).digest("hex").slice(0, 24)}`;
  const evRef = db().collection("billingEvents").doc(id);
  const existing = await evRef.get();
  if (existing.exists && existing.data()?.result !== "error") return { id, result: "duplicate" };

  const plan = resolvePlan(cfg, ev);
  const uid = meta.forceUid || await findUidByEmail(ev.email);
  const sign = REVENUE_SIGN[ev.type] ?? 0;
  const revenue = ev.isTest ? 0 : sign * (ev.amount ?? (sign ? plan?.price ?? 0 : 0));

  let result: ProcessResult = "no_change";
  let before: Access | null = null;
  let after: Access | null = null;

  if (ev.isTest) {
    result = "test";
  } else if (uid) {
    const userRef = db().collection("users").doc(uid);
    await db().runTransaction(async (tx) => {
      const u = (await tx.get(userRef)).data() || {};
      before = (u.access as Access) || null;
      after = nextAccess(u.access, ev, plan, cfg);
      if (after) {
        tx.set(userRef, {
          access: { ...after, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          ...legacyMirror(after),
          email: u.email || ev.email,
        }, { merge: true });
        result = "applied";
      }
    });
  } else if (ev.email) {
    const a = nextAccess(undefined, ev, plan, cfg);
    if (a) {
      // pagou antes de criar conta: guarda e aplica quando ele se cadastrar
      await db().collection("pendingAccess").doc(ev.email).set({
        access: a, fromEventId: id, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      result = "pending_user";
    }
  }
  if (!plan && sign > 0 && (result as ProcessResult) === "applied") result = "unmatched_plan";

  // assinatura
  if (!ev.isTest && (ev.externalSubscriptionId || sign > 0)) {
    const subKey = `${ev.provider}_${(ev.externalSubscriptionId || ev.email || "unknown").replace(/[\/.#$\[\]]/g, "_")}`;
    const subRef = db().collection("subscriptions").doc(subKey);
    const statusBy: Partial<Record<CanonicalType, string>> = {
      PAYMENT_APPROVED: "active", PAYMENT_RENEWED: "active", RENEWAL_LATE: "past_due",
      SUBSCRIPTION_CANCELED: "canceled", SUBSCRIPTION_EXPIRED: "expired", REFUNDED: "refunded", CHARGEBACK: "refunded",
    };
    const patch: any = {
      provider: ev.provider, email: ev.email, uid: uid || null,
      externalSubscriptionId: ev.externalSubscriptionId || null,
      planId: plan?.id ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (statusBy[ev.type]) patch.status = statusBy[ev.type];
    if (sign > 0) {
      patch.lastPaymentAt = TS.fromDate(ev.occurredAt);
      patch.lastAmount = ev.amount ?? plan?.price ?? null;
      patch.paymentsCount = admin.firestore.FieldValue.increment(1);
      const a = after as Access | null;
      if (a?.currentPeriodEnd) patch.currentPeriodEnd = a.currentPeriodEnd;
    }
    if (ev.type === "SUBSCRIPTION_CANCELED") patch.canceledAt = TS.fromDate(ev.occurredAt);
    const subSnap = await subRef.get();
    if (!subSnap.exists || (sign > 0 && !subSnap.data()?.startedAt)) patch.startedAt = TS.fromDate(ev.occurredAt);
    await subRef.set(patch, { merge: true });
  }

  await evRef.set({
    provider: ev.provider,
    rawType: ev.rawType,
    type: ev.type,
    email: ev.email,
    name: ev.name ?? null,
    uid: uid || null,
    matched: !!uid,
    planId: plan?.id ?? null,
    amount: ev.amount,
    revenue,
    currency: ev.currency,
    externalPaymentId: ev.externalPaymentId ?? null,
    externalSubscriptionId: ev.externalSubscriptionId ?? null,
    externalProductIds: ev.externalProductIds,
    paymentMethod: ev.paymentMethod ?? null,
    utm: ev.utm ?? null,
    occurredAt: TS.fromDate(ev.occurredAt),
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    isTest: ev.isTest,
    endpoint: meta.endpoint,
    result,
    accessBefore: before,
    accessAfter: after,
    rawJson: rawJson.slice(0, 60000),
  });

  return { id, result };
}

/** Aplica acesso guardado em pendingAccess quando o usuário se cadastra. */
export async function applyPendingAccess(uid: string, email: string | null) {
  if (!email) return false;
  const ref = db().collection("pendingAccess").doc(email.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) return false;
  const { access, fromEventId } = snap.data() as { access: Access; fromEventId: string };
  await db().collection("users").doc(uid).set(
    { access: { ...access, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, ...legacyMirror(access) },
    { merge: true },
  );
  await db().collection("billingEvents").doc(fromEventId).set({ uid, matched: true, result: "applied" }, { merge: true });
  await db().collection("subscriptions").where("email", "==", email.toLowerCase()).get()
    .then((s) => Promise.all(s.docs.map((d) => d.ref.update({ uid }))));
  await ref.delete();
  return true;
}
