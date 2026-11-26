// API do painel admin. Uma única callable (`adminApi`) com roteamento por `action`.
// Só responde para quem tem custom claim `admin: true` OU e-mail em ADMIN_EMAILS.
// Toda ação que altera dado grava em `adminAudit`.

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { defineString } from "firebase-functions/params";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { ADAPTERS } from "./billing/adapters";
import {
  Access, applyPendingAccess, findUidByEmail, getBillingConfig, hasAccess, legacyMirror, nextAccess, resolvePlan,
} from "./billing/engine";
import { BillingConfig, INTERVAL_DAYS, PROVIDERS, ProviderId } from "./billing/types";
import { AI_MODEL, AI_PRICE, brParts } from "./ai";
import { OLIMPO_API_KEY, cancelSubscription as olimpoCancel, ping as olimpoPing, syncWhere as olimpoSync } from "./billing/olimpo";

export const ADMIN_EMAILS = defineString("ADMIN_EMAILS", { default: "" });

const db = () => admin.firestore();
const TS = admin.firestore.Timestamp;
const FV = admin.firestore.FieldValue;
const DAY = 864e5;
const DATA_COLLECTIONS = [
  "transactions", "fixedBills", "creditCards", "forecasts", "budgetLimits",
  "events", "calendarConnections", "calendarCategories",
];

const ms = (v: any): number | null =>
  v?.toMillis?.() ?? (typeof v === "number" ? v : typeof v === "string" && v ? Date.parse(v) || null : null);

function isAdmin(req: CallableRequest): boolean {
  const t = req.auth?.token;
  if (!t) return false;
  if (t.admin === true) return true;
  const list = ADMIN_EMAILS.value().split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!t.email && list.includes(String(t.email).toLowerCase());
}

async function audit(req: CallableRequest, action: string, target: { uid?: string; email?: string | null } | null, data: any) {
  await db().collection("adminAudit").add({
    actorUid: req.auth?.uid, actorEmail: req.auth?.token.email || null,
    action, targetUid: target?.uid || null, targetEmail: target?.email || null,
    ...data, at: FV.serverTimestamp(),
  });
}

// ─── helpers de leitura ─────────────────────────────────────────────────────
async function allAuthUsers() {
  const out: admin.auth.UserRecord[] = [];
  let token: string | undefined;
  do {
    const page = await admin.auth().listUsers(1000, token);
    out.push(...page.users);
    token = page.pageToken;
  } while (token);
  return out;
}

const monthsOf = (interval?: string) =>
  ({ month: 1, quarter: 3, semester: 6, year: 12, lifetime: 0 } as Record<string, number>)[interval || "month"] ?? 1;

/** Status exibido no admin (uma palavra só, para filtrar). */
function displayStatus(u: any, now: number): string {
  const a: Access | undefined = u.access;
  if (u.blocked || a?.status === "blocked") return "blocked";
  if (a && a.status !== "trial") {
    if (!hasAccess(u, now)) return a.status === "refunded" ? "refunded" : "expired";
    return a.status; // active | past_due | canceled | courtesy
  }
  if (!a && u.active === true) return "active";
  const t = ms(u.trialEndsAt);
  if (t && t > now) return "trial";
  return "trial_expired";
}

function buildRow(auth: admin.auth.UserRecord | undefined, uid: string, u: any, paidByUid: Map<string, number>, now: number) {
  const usage = u.usage || {};
  const profileFields = ["name", "phone", "city", "state", "birthDate", "income"];
  const filled = profileFields.filter((f) => u[f]).length;
  return {
    uid,
    email: (u.email || auth?.email || "").toLowerCase(),
    name: u.name || auth?.displayName || "",
    phone: u.phone || "",
    city: u.city || "", state: u.state || "",
    income: u.income || "", profession: u.profession || "",
    createdAt: ms(u.createdAt) ?? (auth ? Date.parse(auth.metadata.creationTime) : null),
    lastSignInAt: auth?.metadata.lastSignInTime ? Date.parse(auth.metadata.lastSignInTime) : null,
    // Firebase Auth renova o token enquanto o app está aberto: dá histórico real mesmo de quem é anterior ao rastreio
    lastOpenAt: maxT(ms(u.lastOpenAt), auth?.metadata.lastRefreshTime ? Date.parse(auth.metadata.lastRefreshTime) : null,
      auth?.metadata.lastSignInTime ? Date.parse(auth.metadata.lastSignInTime) : null),
    lastOpenVia: u.lastOpenVia || null,
    lastActiveAt: maxT(ms(u.lastOpenAt), ms(u.lastActiveAt), ms(usage.lastTxAt),
      auth?.metadata.lastRefreshTime ? Date.parse(auth.metadata.lastRefreshTime) : null),
    emailVerified: !!auth?.emailVerified,
    authProviders: auth?.providerData.map((p) => p.providerId) || [],
    status: displayStatus(u, now),
    hasAccess: hasAccess(u, now),
    planId: u.access?.planId || (u.plan && !["trial", "free"].includes(u.plan) ? u.plan : null),
    provider: u.access?.provider || null,
    periodEnd: ms(u.access?.currentPeriodEnd),
    graceUntil: ms(u.access?.graceUntil),
    trialEndsAt: ms(u.trialEndsAt),
    everPaid: !!u.access?.everPaid || (paidByUid.get(uid) || 0) > 0,
    totalPaid: paidByUid.get(uid) || 0,
    usage: {
      transactions: usage.transactions || 0,
      events: usage.events || 0,
      firstTxAt: ms(usage.firstTxAt),
      lastTxAt: ms(usage.lastTxAt),
      googleConnected: !!usage.googleConnected,
    },
    acquisition: u.acquisition || null,
    referredBy: u.referredBy || u.acquisition?.ref || null,
    profileCompleteness: Math.round((filled / profileFields.length) * 100),
    blocked: !!u.blocked,
    isAdmin: !!auth?.customClaims?.admin,
    hasDoc: !!u.__exists,
    hasAuth: !!auth,
    notesCount: Array.isArray(u.adminNotes) ? u.adminNotes.length : 0,
    pushEnabled: !!u.fcmToken,
    whatsappOptIn: u.whatsappOptIn === true,
    whatsappOptOut: u.whatsappOptOut === true,
    lastContactAt: ms(u.lastContactAt),
  };
}

async function loadUsers() {
  const now = Date.now();
  const [authUsers, docs, events] = await Promise.all([
    allAuthUsers(),
    db().collection("users").get(),
    db().collection("billingEvents").where("revenue", "!=", 0).get(),
  ]);
  const paidByUid = new Map<string, number>();
  events.docs.forEach((d) => {
    const e = d.data();
    if (e.uid && !e.isTest) paidByUid.set(e.uid, (paidByUid.get(e.uid) || 0) + (e.revenue || 0));
  });
  const docMap = new Map(docs.docs.map((d) => [d.id, { ...d.data(), __exists: true }]));
  const authMap = new Map(authUsers.map((a) => [a.uid, a]));
  const uids = new Set([...authMap.keys(), ...docMap.keys()]);
  return [...uids].map((uid) => buildRow(authMap.get(uid), uid, docMap.get(uid) || {}, paidByUid, now));
}

// ─── overview ───────────────────────────────────────────────────────────────
async function overview() {
  const now = Date.now();
  const cfg = await getBillingConfig();
  const planById = new Map(cfg.plans.map((p) => [p.id, p]));
  const users = await loadUsers();
  const evSnap = await db().collection("billingEvents").where("receivedAt", ">=", TS.fromMillis(now - 400 * DAY)).get();
  const events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)).filter((e) => !e.isTest);

  const paying = users.filter((u) => u.hasAccess && ["active", "past_due", "canceled"].includes(u.status));
  const mrr = paying.reduce((s, u) => {
    const p = u.planId ? planById.get(u.planId) : undefined;
    const m = monthsOf(p?.interval);
    return s + (p && m ? p.price / m : 0);
  }, 0);

  const monthKey = (t: number) => new Date(t - 3 * 3600e3).toISOString().slice(0, 7); // BRT
  const dayKey = (t: number) => new Date(t - 3 * 3600e3).toISOString().slice(0, 10);
  const revenueByMonth: Record<string, number> = {};
  const revenueByProvider: Record<string, number> = {};
  for (const e of events) {
    const t = ms(e.occurredAt) || ms(e.receivedAt) || now;
    revenueByMonth[monthKey(t)] = (revenueByMonth[monthKey(t)] || 0) + (e.revenue || 0);
    if (e.revenue) revenueByProvider[e.provider] = (revenueByProvider[e.provider] || 0) + e.revenue;
  }
  const within = (t: number | null, d: number) => !!t && now - t <= d * DAY;
  const signupsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) signupsByDay[dayKey(now - i * DAY)] = 0;
  users.forEach((u) => { if (u.createdAt && within(u.createdAt, 30)) signupsByDay[dayKey(u.createdAt)] = (signupsByDay[dayKey(u.createdAt)] || 0) + 1; });

  const trialEnded = users.filter((u) => u.trialEndsAt && u.trialEndsAt < now);
  const churned30 = events.filter((e) => ["SUBSCRIPTION_CANCELED", "SUBSCRIPTION_EXPIRED", "REFUNDED", "CHARGEBACK"].includes(e.type) && within(ms(e.occurredAt), 30));
  const churnedUsers = new Set(churned30.map((e) => e.uid || e.email));

  const activated = (u: any) => u.usage.transactions + u.usage.events > 0;
  const engaged = (u: any) => u.usage.transactions + u.usage.events >= 10;

  const by = (key: (u: any) => string | null) => {
    const m: Record<string, { signups: number; paid: number }> = {};
    users.forEach((u) => { const k = key(u) || "(direto/desconhecido)"; m[k] = m[k] || { signups: 0, paid: 0 }; m[k].signups++; if (u.everPaid) m[k].paid++; });
    return Object.entries(m).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.signups - a.signups).slice(0, 10);
  };

  return {
    generatedAt: now,
    kpis: {
      totalUsers: users.length,
      newUsers7d: users.filter((u) => within(u.createdAt, 7)).length,
      newUsers30d: users.filter((u) => within(u.createdAt, 30)).length,
      payingUsers: paying.length,
      trialUsers: users.filter((u) => u.status === "trial").length,
      courtesyUsers: users.filter((u) => u.status === "courtesy").length,
      pastDue: users.filter((u) => u.status === "past_due").length,
      mrr,
      arr: mrr * 12,
      revenueThisMonth: revenueByMonth[monthKey(now)] || 0,
      revenue30d: events.filter((e) => within(ms(e.occurredAt), 30)).reduce((s, e) => s + (e.revenue || 0), 0),
      refunds30d: -events.filter((e) => e.revenue < 0 && within(ms(e.occurredAt), 30)).reduce((s, e) => s + e.revenue, 0),
      arpu: paying.length ? mrr / paying.length : 0,
      trialConversion: trialEnded.length ? trialEnded.filter((u) => u.everPaid).length / trialEnded.length : null,
      churn30d: paying.length + churnedUsers.size ? churnedUsers.size / (paying.length + churnedUsers.size) : null,
      dau: users.filter((u) => within(u.lastActiveAt, 1)).length,
      wau: users.filter((u) => within(u.lastActiveAt, 7)).length,
      mau: users.filter((u) => within(u.lastActiveAt, 30)).length,
      profileComplete: users.length ? users.filter((u) => u.profileCompleteness === 100).length / users.length : 0,
      inactive: inactiveBuckets(users, now),
    },
    funnel: [
      { step: "Cadastros", value: users.length },
      { step: "Ativados (1º lançamento)", value: users.filter(activated).length },
      { step: "Engajados (10+ registros)", value: users.filter(engaged).length },
      { step: "Pagaram", value: users.filter((u) => u.everPaid).length },
      { step: "Pagantes hoje", value: paying.length },
    ],
    series: {
      signupsByDay: Object.entries(signupsByDay).map(([day, value]) => ({ day, value })),
      revenueByMonth: Object.entries(revenueByMonth).sort().slice(-12).map(([month, value]) => ({ month, value })),
    },
    revenueByProvider,
    planMix: cfg.plans.map((p) => ({ planId: p.id, name: p.name, users: paying.filter((u) => u.planId === p.id).length })),
    acquisition: {
      bySource: by((u) => u.acquisition?.utm_source || (u.referredBy ? "indicação" : null)),
      byCampaign: by((u) => u.acquisition?.utm_campaign || null),
    },
    upcoming: {
      renewals7d: paying.filter((u) => u.periodEnd && u.periodEnd > now && u.periodEnd - now < 7 * DAY)
        .map((u) => ({ uid: u.uid, email: u.email, name: u.name, planId: u.planId, at: u.periodEnd, status: u.status }))
        .sort((a, b) => a.at! - b.at!),
      trialsEnding72h: users.filter((u) => u.status === "trial" && u.trialEndsAt && u.trialEndsAt - now < 3 * DAY)
        .map((u) => ({ uid: u.uid, email: u.email, name: u.name, at: u.trialEndsAt, activated: activated(u) }))
        .sort((a, b) => a.at! - b.at!),
    },
    alerts: buildAlerts(cfg, users, events, now),
  };
}

function buildAlerts(cfg: BillingConfig, users: any[], events: any[], now: number) {
  const alerts: { level: "critical" | "warning" | "info"; title: string; detail: string; link?: string }[] = [];
  const unmatched = events.filter((e) => !e.matched && ["PAYMENT_APPROVED", "PAYMENT_RENEWED"].includes(e.type));
  if (unmatched.length) alerts.push({ level: "critical", title: `${unmatched.length} pagamento(s) sem conta vinculada`, detail: "Alguém pagou com um e-mail que não tem cadastro. O acesso fica pendente até vincular.", link: "payments?filter=unmatched" });
  const unmatchedPlan = events.filter((e) => e.result === "unmatched_plan");
  if (unmatchedPlan.length) alerts.push({ level: "warning", title: `${unmatchedPlan.length} pagamento(s) sem plano identificado`, detail: "Cadastre o ID do produto/oferta do gateway no plano correspondente.", link: "plans" });
  const pastDue = users.filter((u) => u.status === "past_due");
  if (pastDue.length) alerts.push({ level: "warning", title: `${pastDue.length} assinatura(s) em atraso`, detail: "Ainda com acesso no período de carência.", link: "subscriptions?filter=past_due" });
  const legacy = events.filter((e) => e.endpoint === "legacy" && now - (ms(e.receivedAt) || 0) < 30 * DAY);
  if (legacy.length) alerts.push({ level: "critical", title: "Webhook antigo da LastLink ainda em uso", detail: "O endpoint antigo não tem token. Troque a URL no painel da LastLink pela nova (aba Gateways) e desligue o legado.", link: "gateways" });
  for (const p of PROVIDERS) {
    const pc = cfg.providers[p];
    if (pc?.enabled && !pc.validated) alerts.push({ level: "warning", title: `${pc.label} habilitado sem validação`, detail: "Envie um evento de teste e confira o mapeamento antes de usar em produção.", link: "gateways" });
  }
  const noDoc = users.filter((u) => !u.hasDoc);
  if (noDoc.length) alerts.push({ level: "info", title: `${noDoc.length} conta(s) sem documento de perfil`, detail: "Existem no login mas não no banco — normalmente cadastro interrompido.", link: "users?filter=nodoc" });
  return alerts;
}

// ─── detalhe do usuário ─────────────────────────────────────────────────────
async function getUser(uid: string) {
  const [docSnap, authRec] = await Promise.all([
    db().collection("users").doc(uid).get(),
    admin.auth().getUser(uid).catch(() => undefined),
  ]);
  const u = docSnap.data() || {};
  const email = (u.email || authRec?.email || "").toLowerCase();
  const [byUid, byEmail, subs, auditSnap, refBy, refTo, ...counts] = await Promise.all([
    db().collection("billingEvents").where("uid", "==", uid).get(),
    email ? db().collection("billingEvents").where("email", "==", email).get() : Promise.resolve(null),
    db().collection("subscriptions").where("email", "==", email || "__none__").get(),
    db().collection("adminAudit").where("targetUid", "==", uid).get(),
    db().collection("referrals").where("referredBy", "==", uid).get(),
    db().collection("referrals").where("referredUserId", "==", uid).get(),
    ...DATA_COLLECTIONS.map((c) => db().collection(c).where("uid", "==", uid).count().get()),
  ]);
  const evMap = new Map<string, any>();
  [...byUid.docs, ...(byEmail?.docs || [])].forEach((d) => {
    const { rawJson, ...rest } = d.data();
    evMap.set(d.id, { id: d.id, ...rest, occurredAt: ms(rest.occurredAt), receivedAt: ms(rest.receivedAt), hasRaw: !!rawJson });
  });
  const paid = new Map<string, number>([[uid, [...evMap.values()].reduce((s, e) => s + (e.isTest ? 0 : e.revenue || 0), 0)]]);
  return {
    row: buildRow(authRec, uid, { ...u, __exists: docSnap.exists }, paid, Date.now()),
    profile: { birthDate: u.birthDate || "", gender: u.gender || "" },
    access: u.access ? { ...u.access, currentPeriodEnd: ms(u.access.currentPeriodEnd), graceUntil: ms(u.access.graceUntil) } : null,
    notes: (u.adminNotes || []).map((n: any) => ({ ...n, at: ms(n.at) })),
    events: [...evMap.values()].sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0)),
    subscriptions: subs.docs.map((d) => {
      const s = d.data();
      return { id: d.id, ...s, createdAt: ms(s.createdAt), nextChargeAt: ms(s.nextChargeAt), lastSyncedAt: ms(s.lastSyncedAt), startedAt: ms(s.startedAt), lastPaymentAt: ms(s.lastPaymentAt), currentPeriodEnd: ms(s.currentPeriodEnd), canceledAt: ms(s.canceledAt), updatedAt: ms(s.updatedAt) };
    }),
    audit: auditSnap.docs.map((d) => ({ id: d.id, ...d.data(), at: ms(d.data().at) })).sort((a: any, b: any) => b.at - a.at),
    referrals: { invited: refBy.size, invitedBy: refTo.docs[0]?.data().referredBy || null },
    counts: Object.fromEntries(DATA_COLLECTIONS.map((c, i) => [c, (counts[i] as any).data().count])),
    auth: authRec ? {
      disabled: authRec.disabled,
      creationTime: Date.parse(authRec.metadata.creationTime),
      lastSignInTime: authRec.metadata.lastSignInTime ? Date.parse(authRec.metadata.lastSignInTime) : null,
      providers: authRec.providerData.map((p) => p.providerId),
    } : null,
  };
}

// ─── ações sobre usuário ────────────────────────────────────────────────────
async function userAction(req: CallableRequest, d0: any) {
  // a ação do usuário vem em `op` (`action` é a rota "userAction"); aceita o formato antigo também
  const d = { ...d0, action: d0.op || (d0.action !== "userAction" ? d0.action : undefined) };
  const uid = String(d.uid || "");
  const reason = String(d.reason || "").trim();
  if (!uid) throw new HttpsError("invalid-argument", "uid obrigatório");
  const ref = db().collection("users").doc(uid);
  const snap = await ref.get();
  const u = snap.data() || {};
  const authRec = await admin.auth().getUser(uid).catch(() => undefined);
  const email = u.email || authRec?.email || null;
  const before = { access: u.access || null, trialEndsAt: u.trialEndsAt || null, blocked: !!u.blocked };
  const cfg = await getBillingConfig();
  const now = Date.now();
  const needsReason = !["note", "password_reset_link", "update_profile", "set_whatsapp_optout"].includes(d.action);
  if (needsReason && reason.length < 3) throw new HttpsError("invalid-argument", "Informe o motivo (fica no log de auditoria).");

  let patch: any = {};
  let result: any = { ok: true };

  switch (d.action) {
    case "grant_access": {
      const plan = cfg.plans.find((p) => p.id === d.planId);
      const until = d.until ? Number(d.until) : now + (Number(d.days) || INTERVAL_DAYS[plan?.interval || "month"]) * DAY;
      const access: Access = {
        status: d.kind === "paid" ? "active" : "courtesy",
        planId: plan?.id || d.planId || null, provider: "manual",
        currentPeriodEnd: TS.fromMillis(until), graceUntil: null,
        subscriptionId: u.access?.subscriptionId || null, source: "manual",
        everPaid: u.access?.everPaid || false,
      };
      patch = { access: { ...access, updatedAt: FV.serverTimestamp() }, ...legacyMirror(access), blocked: false };
      break;
    }
    case "extend_trial": {
      const days = Math.max(1, Math.min(90, Number(d.days) || 0));
      const base = Math.max(now, ms(u.trialEndsAt) || 0);
      patch = { trialEndsAt: TS.fromMillis(base + days * DAY) };
      if (u.access && !["active", "courtesy"].includes(u.access.status)) patch.access = { ...u.access, status: "trial", source: "trial", updatedAt: FV.serverTimestamp() };
      break;
    }
    case "set_period_end": {
      if (!u.access) throw new HttpsError("failed-precondition", "Usuário sem acesso pago/cortesia.");
      const access = { ...u.access, currentPeriodEnd: TS.fromMillis(Number(d.until)) };
      patch = { access: { ...access, updatedAt: FV.serverTimestamp() }, ...legacyMirror(access) };
      break;
    }
    case "revoke_access": {
      const access: Access = { ...(u.access || { source: "manual" }), status: "expired", currentPeriodEnd: TS.fromMillis(now), graceUntil: null, source: "manual" };
      patch = { access: { ...access, updatedAt: FV.serverTimestamp() }, active: false, trialEndsAt: TS.fromMillis(Math.min(ms(u.trialEndsAt) || now, now)) };
      break;
    }
    case "block": {
      patch = { blocked: true, accessBeforeBlock: u.access || null, access: { ...(u.access || { source: "manual" }), status: "blocked", updatedAt: FV.serverTimestamp() }, active: false };
      await admin.auth().revokeRefreshTokens(uid).catch(() => {});
      break;
    }
    case "unblock": {
      const prev = u.accessBeforeBlock || null;
      patch = { blocked: false, access: prev ? { ...prev, updatedAt: FV.serverTimestamp() } : FV.delete(), accessBeforeBlock: FV.delete(), ...(prev ? legacyMirror(prev) : { active: false }) };
      break;
    }
    case "note": {
      const text = String(d.text || "").trim().slice(0, 2000);
      if (!text) throw new HttpsError("invalid-argument", "Nota vazia");
      patch = { adminNotes: FV.arrayUnion({ text, by: req.auth?.token.email || req.auth?.uid, at: TS.now() }) };
      break;
    }
    case "update_profile": {
      const allowed = ["name", "phone", "city", "state", "profession", "income", "birthDate"];
      allowed.forEach((k) => { if (typeof d.profile?.[k] === "string") patch[k] = d.profile[k].trim().slice(0, 200); });
      if (typeof patch.phone === "string") patch.phone = patch.phone.replace(/\D/g, "").slice(0, 13);
      if (typeof patch.birthDate === "string" && patch.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(patch.birthDate)) delete patch.birthDate;
      break;
    }
    case "password_reset_link": {
      if (!email) throw new HttpsError("failed-precondition", "Usuário sem e-mail");
      result = { ok: true, link: await admin.auth().generatePasswordResetLink(email) };
      break;
    }
    case "revoke_sessions": {
      await admin.auth().revokeRefreshTokens(uid);
      break;
    }
    case "set_admin": {
      if (uid === req.auth?.uid && !d.value) throw new HttpsError("failed-precondition", "Você não pode remover seu próprio acesso admin.");
      const claims = { ...(authRec?.customClaims || {}), admin: !!d.value };
      await admin.auth().setCustomUserClaims(uid, claims);
      break;
    }
    case "cancel_gateway_subscription": {
      const subId = String(d.subscriptionId || "");
      const subRef = db().collection("subscriptions").doc(subId);
      const sub = (await subRef.get()).data();
      if (!sub || sub.uid !== uid) throw new HttpsError("not-found", "Assinatura não encontrada para este usuário");
      if (sub.provider !== "olimpopay") throw new HttpsError("failed-precondition", "Cancelamento automático só existe para Olimpo Pay. Nos outros gateways cancele no painel deles.");
      await olimpoCancel(OLIMPO_API_KEY.value(), sub.externalSubscriptionId);
      await subRef.set({ status: "canceled", canceledAt: TS.now(), updatedAt: FV.serverTimestamp() }, { merge: true });
      // acesso continua até o fim do período pago
      if (u.access && ["active", "past_due"].includes(u.access.status)) {
        patch = { access: { ...u.access, status: "canceled", updatedAt: FV.serverTimestamp() } };
      }
      break;
    }
    case "set_whatsapp_optout": {
      patch = { whatsappOptOut: !!d.value, whatsappOptOutAt: d.value ? TS.now() : null };
      break;
    }
    case "apply_pending": {
      result = { ok: true, applied: await applyPendingAccess(uid, email) };
      break;
    }
    case "delete_account": {
      if (String(d.confirmEmail || "").toLowerCase() !== String(email || "").toLowerCase()) {
        throw new HttpsError("invalid-argument", "Confirmação de e-mail não confere.");
      }
      for (const c of DATA_COLLECTIONS) {
        const s = await db().collection(c).where("uid", "==", uid).get();
        for (let i = 0; i < s.docs.length; i += 400) {
          const b = db().batch();
          s.docs.slice(i, i + 400).forEach((x) => b.delete(x.ref));
          await b.commit();
        }
      }
      await db().collection("googleConnections").doc(uid).delete().catch(() => {});
      // registros financeiros ficam (obrigação fiscal), mas desvinculados e com e-mail pseudonimizado
      const hash = email ? crypto.createHash("sha256").update(email).digest("hex").slice(0, 16) : null;
      const evs = await db().collection("billingEvents").where("uid", "==", uid).get();
      await Promise.all(evs.docs.map((x) => x.ref.update({ uid: null, email: hash ? `deleted:${hash}` : null, name: null, rawJson: FV.delete() })));
      await ref.delete();
      await admin.auth().deleteUser(uid).catch(() => {});
      await audit(req, "delete_account", { uid, email: hash ? `deleted:${hash}` : null }, { reason, before: null, after: null });
      return { ok: true };
    }
    default:
      throw new HttpsError("invalid-argument", `Ação desconhecida: ${d.action}`);
  }

  if (Object.keys(patch).length) await ref.set(patch, { merge: true });
  const after = (await ref.get()).data() || {};
  await audit(req, d.action, { uid, email }, {
    reason: reason || null,
    params: { planId: d.planId ?? null, days: d.days ?? null, until: d.until ?? null, kind: d.kind ?? null, value: d.value ?? null, subscriptionId: d.subscriptionId ?? null },
    before: JSON.parse(JSON.stringify(before)),
    after: JSON.parse(JSON.stringify({ access: after.access || null, trialEndsAt: after.trialEndsAt || null, blocked: !!after.blocked })),
  });
  return result;
}

// ─── billing (ledger / assinaturas / gateways) ──────────────────────────────
async function listBilling(d: any) {
  const limit = Math.min(Number(d.limit) || 500, 2000);
  const [ev, subs] = await Promise.all([
    db().collection("billingEvents").orderBy("receivedAt", "desc").limit(limit).get(),
    db().collection("subscriptions").get(),
  ]);
  return {
    events: ev.docs.map((x) => {
      const { rawJson, accessBefore, accessAfter, ...e } = x.data();
      return { id: x.id, ...e, occurredAt: ms(e.occurredAt), receivedAt: ms(e.receivedAt), hasRaw: !!rawJson };
    }),
    subscriptions: subs.docs.map((x) => {
      const s = x.data();
      return { id: x.id, ...s, createdAt: ms(s.createdAt), nextChargeAt: ms(s.nextChargeAt), lastSyncedAt: ms(s.lastSyncedAt), startedAt: ms(s.startedAt), lastPaymentAt: ms(s.lastPaymentAt), currentPeriodEnd: ms(s.currentPeriodEnd), canceledAt: ms(s.canceledAt), updatedAt: ms(s.updatedAt) };
    }),
  };
}

async function getEventRaw(id: string) {
  const s = await db().collection("billingEvents").doc(id).get();
  if (!s.exists) throw new HttpsError("not-found", "Evento não encontrado");
  const e = s.data()!;
  return { rawJson: e.rawJson || null, accessBefore: e.accessBefore || null, accessAfter: e.accessAfter || null };
}

async function linkEvent(req: CallableRequest, d: any) {
  const evRef = db().collection("billingEvents").doc(String(d.eventId));
  const ev = (await evRef.get()).data();
  if (!ev) throw new HttpsError("not-found", "Evento não encontrado");
  const uid = String(d.uid);
  const userRef = db().collection("users").doc(uid);
  const cfg = await getBillingConfig();
  const norm: any = {
    provider: ev.provider, type: ev.type, externalSubscriptionId: ev.externalSubscriptionId,
    externalProductIds: ev.externalProductIds || [], amount: ev.amount, intervalHint: null,
    occurredAt: new Date(ms(ev.occurredAt) || Date.now()),
  };
  const plan = cfg.plans.find((p) => p.id === (d.planId || ev.planId)) || resolvePlan(cfg, norm);
  const u = (await userRef.get()).data() || {};
  const access = nextAccess(u.access, norm, plan, cfg);
  if (access) await userRef.set({ access: { ...access, updatedAt: FV.serverTimestamp() }, ...legacyMirror(access) }, { merge: true });
  await evRef.update({ uid, matched: true, result: access ? "applied" : "no_change", linkedBy: req.auth?.token.email || req.auth?.uid, planId: plan?.id ?? ev.planId ?? null });
  if (ev.email) await db().collection("pendingAccess").doc(ev.email).delete().catch(() => {});
  await audit(req, "link_payment", { uid, email: u.email || null }, { reason: d.reason || null, params: { eventId: d.eventId, planId: plan?.id || null } });
  return { ok: true, applied: !!access };
}

const webhookBase = () => `https://us-central1-${process.env.GCLOUD_PROJECT || "lyvo-web"}.cloudfunctions.net/billingWebhook`;

async function gateways() {
  const cfg = await getBillingConfig();
  const secrets = (await db().doc("config/billingSecrets").get()).data() || {};
  const since = TS.fromMillis(Date.now() - 30 * DAY);
  const recent = await db().collection("billingEvents").where("receivedAt", ">=", since).get();
  const errors = await db().collection("webhookErrors").where("at", ">=", since).get();
  return PROVIDERS.map((p) => {
    const evs = recent.docs.map((x) => x.data()).filter((e) => e.provider === p);
    const last = evs.map((e) => ms(e.receivedAt) || 0).sort((a, b) => b - a)[0] || null;
    const token = secrets.tokens?.[p] || null;
    return {
      id: p, mode: p === "olimpopay" ? "api" : "link", ...cfg.providers[p],
      webhookUrl: token ? `${webhookBase()}/${p}?token=${token}` : null,
      hasNativeSecret: !!secrets.native?.[p],
      events30d: evs.length,
      revenue30d: evs.reduce((s, e) => s + (e.isTest ? 0 : e.revenue || 0), 0),
      lastEventAt: last,
      errors30d: errors.docs.filter((x) => x.data().provider === p).length,
      supportsNative: !!ADAPTERS[p].verifyNative,
    };
  });
}

async function saveConfig(req: CallableRequest, d: any) {
  const c = d.config as BillingConfig;
  if (!c || !Array.isArray(c.plans) || !c.plans.length) throw new HttpsError("invalid-argument", "Config inválida");
  const ids = new Set<string>();
  for (const p of c.plans) {
    if (!/^[a-z0-9_-]{2,32}$/.test(p.id) || ids.has(p.id)) throw new HttpsError("invalid-argument", `ID de plano inválido/duplicado: ${p.id}`);
    ids.add(p.id);
    if (!(p.price > 0)) throw new HttpsError("invalid-argument", `Preço inválido no plano ${p.id}`);
    for (const url of Object.values(p.checkout || {})) {
      if (url && !/^https:\/\//.test(url)) throw new HttpsError("invalid-argument", `Link de checkout precisa ser https (${p.id})`);
    }
  }
  const before = await getBillingConfig();
  const clean: BillingConfig = {
    plans: c.plans,
    providerOrder: c.providerOrder.filter((p) => PROVIDERS.includes(p)),
    providers: c.providers,
    trialDays: Math.max(1, Math.min(7, Number(c.trialDays) || 3)),
    graceDays: Math.max(0, Math.min(15, Number(c.graceDays) || 0)),
    allowLegacyLastlink: !!c.allowLegacyLastlink,
  };
  await db().doc("config/billing").set({ ...clean, updatedAt: FV.serverTimestamp() });
  await audit(req, "save_billing_config", null, { reason: d.reason || null, before: JSON.parse(JSON.stringify(before)), after: clean });
  return { ok: true };
}

async function rotateToken(req: CallableRequest, d: any) {
  const p = d.provider as ProviderId;
  if (!PROVIDERS.includes(p)) throw new HttpsError("invalid-argument", "Gateway inválido");
  const token = crypto.randomBytes(24).toString("hex");
  await db().doc("config/billingSecrets").set({ tokens: { [p]: token } }, { merge: true });
  await audit(req, "rotate_webhook_token", null, { params: { provider: p } });
  return { ok: true, webhookUrl: `${webhookBase()}/${p}?token=${token}` };
}

async function setNativeSecret(req: CallableRequest, d: any) {
  const p = d.provider as ProviderId;
  if (!PROVIDERS.includes(p)) throw new HttpsError("invalid-argument", "Gateway inválido");
  await db().doc("config/billingSecrets").set({ native: { [p]: String(d.secret || "") || FV.delete() } }, { merge: true });
  await audit(req, "set_native_secret", null, { params: { provider: p, cleared: !d.secret } });
  return { ok: true };
}

/** Simula um payload sem gravar nada — para validar gateway novo. */
async function dryRun(d: any) {
  const p = d.provider as ProviderId;
  if (!PROVIDERS.includes(p)) throw new HttpsError("invalid-argument", "Gateway inválido");
  let body: any;
  try { body = typeof d.payload === "string" ? JSON.parse(d.payload) : d.payload; } catch { throw new HttpsError("invalid-argument", "JSON inválido"); }
  const ev = ADAPTERS[p].normalize({ body, headers: {}, query: {} });
  if (!ev) return { normalized: null };
  const cfg = await getBillingConfig();
  const plan = resolvePlan(cfg, ev);
  const uid = await findUidByEmail(ev.email);
  const current = uid ? (await db().collection("users").doc(uid).get()).data()?.access : undefined;
  const next = nextAccess(current, ev, plan, cfg);
  return {
    normalized: { ...ev, occurredAt: ev.occurredAt.getTime() },
    plan: plan ? { id: plan.id, name: plan.name } : null,
    matchedUid: uid,
    accessAfter: next ? { ...next, currentPeriodEnd: ms(next.currentPeriodEnd), graceUntil: ms(next.graceUntil) } : null,
  };
}

// ─── diagnóstico: testa cada integração ao vivo ─────────────────────────────
type Check = { id: string; label: string; status: "ok" | "warn" | "fail"; detail: string; link?: string };
const brDate = (t: number | null) => (t ? new Date(t).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

async function health(): Promise<{ at: number; checks: Check[] }> {
  const now = Date.now();
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);
  const list = ADMIN_EMAILS.value().split(",").map((s) => s.trim()).filter(Boolean);
  add({ id: "backend", label: "Servidor (Cloud Functions) publicado", status: "ok", detail: `Respondendo. Admins: ${list.join(", ") || "por permissão no login"}` });

  const cfgSnap = await db().doc("config/billing").get();
  add({ id: "config", label: "Planos e gateways salvos", status: cfgSnap.exists ? "ok" : "warn", link: "plans",
    detail: cfgSnap.exists ? "Configuração salva no banco." : "Usando os valores padrão do código. Abra Planos, confira e salve uma vez." });
  const cfg = await getBillingConfig();
  const primary = cfg.providerOrder.find((p) => cfg.providers[p]?.enabled);
  add({ id: "primary", label: "Checkout principal", status: primary === "olimpopay" ? "ok" : "warn", link: "gateways",
    detail: `Principal: ${primary ? cfg.providers[primary].label : "nenhum"}. Fallback: ${cfg.providerOrder.filter((p) => p !== primary && cfg.providers[p]?.enabled).map((p) => cfg.providers[p].label).join(", ") || "nenhum"}.` });

  let key = "";
  try { key = OLIMPO_API_KEY.value(); } catch { /* sem secret */ }
  if (!key) add({ id: "olimpo_key", label: "Chave da API Olimpo Pay", status: "fail", detail: "Secret OLIMPO_API_KEY não configurado. Rode scripts/deploy-backend.sh." });
  else {
    try { await olimpoPing(key); add({ id: "olimpo_key", label: "Chave da API Olimpo Pay", status: "ok", detail: "A API da Olimpo respondeu com a chave configurada." }); }
    catch (e: any) { add({ id: "olimpo_key", label: "Chave da API Olimpo Pay", status: "fail", detail: `A API recusou: ${e?.message || e}${e?.status ? ` (HTTP ${e.status})` : ""}` }); }
  }
  const olimpoSubs = await db().collection("subscriptions").where("provider", "==", "olimpopay").get();
  const paidOlimpo = olimpoSubs.docs.filter((d) => (d.data().paymentsCount || 0) > 0).length;
  add({ id: "olimpo_flow", label: "Venda pela Olimpo Pay de ponta a ponta", status: paidOlimpo > 0 ? "ok" : "warn", link: "payments",
    detail: paidOlimpo > 0 ? `${paidOlimpo} assinatura(s) paga(s) confirmada(s) pela API.` : `${olimpoSubs.size} checkout(s) gerado(s), nenhum pago ainda. Faça uma compra de teste.` });

  const st = (await db().doc("systemStatus/olimpoSync").get()).data();
  const stAt = ms(st?.at);
  add({ id: "olimpo_sync", label: "Conferência automática Olimpo (15 min)", status: stAt && now - stAt < 40 * 60e3 ? "ok" : "warn",
    detail: stAt ? `Última execução ${brDate(stAt)} · ${st?.synced ?? 0} conferida(s), ${st?.errors ?? 0} erro(s).` : "Ainda não rodou. Roda a cada 15 minutos depois do deploy." });
  const md = await db().collection("metricsDaily").orderBy("at", "desc").limit(1).get();
  add({ id: "daily", label: "Rotina diária de vencimentos (03:10)", status: md.empty ? "warn" : "ok",
    detail: md.empty ? "Ainda não rodou. Roda toda madrugada às 03:10." : `Última execução: ${md.docs[0].id}.` });

  const secrets = (await db().doc("config/billingSecrets").get()).data() || {};
  const recent = await db().collection("billingEvents").where("receivedAt", ">=", TS.fromMillis(now - 30 * DAY)).get();
  const ev = recent.docs.map((d) => d.data());
  const llV2 = ev.filter((e) => e.provider === "lastlink" && e.endpoint === "v2").length;
  const llLegacy = ev.filter((e) => e.endpoint === "legacy").length;
  add({ id: "lastlink_url", label: "Webhook novo da LastLink (com token)", status: llV2 > 0 ? "ok" : secrets.tokens?.lastlink ? "warn" : "fail", link: "gateways",
    detail: llV2 > 0 ? `${llV2} evento(s) recebido(s) pela URL nova em 30 dias.` : secrets.tokens?.lastlink ? "URL gerada, mas nenhum evento chegou por ela ainda. Confirme que foi colada na LastLink." : "Gere a URL em Gateways e cole no painel da LastLink." });
  add({ id: "legacy", label: "Webhook antigo da LastLink desligado", status: cfg.allowLegacyLastlink ? (llLegacy ? "fail" : "warn") : "ok", link: "gateways",
    detail: cfg.allowLegacyLastlink ? `Ainda aceita eventos sem token${llLegacy ? ` (${llLegacy} nos últimos 30 dias)` : ""}. Desligue depois de migrar a URL.` : "Desligado." });

  const users = await db().collection("users").get();
  const withUsage = users.docs.filter((d) => d.data().usage).length;
  add({ id: "usage", label: "Contadores de uso dos clientes", status: withUsage >= users.size * 0.9 ? "ok" : "warn", link: "audit",
    detail: `${withUsage} de ${users.size} contas com contador.${withUsage < users.size ? " Rode “Recalcular uso” na Auditoria." : ""}` });
  const fresh = users.docs.map((d) => d.data()).filter((u) => (ms(u.createdAt) || 0) > now - 14 * DAY);
  const withName = fresh.filter((u) => u.name && u.phone).length;
  add({ id: "signup", label: "Cadastro salvando nome e celular", status: !fresh.length ? "warn" : withName / fresh.length >= 0.8 ? "ok" : "fail", link: "users",
    detail: fresh.length ? `${withName} de ${fresh.length} cadastros dos últimos 14 dias com nome e celular.` : "Nenhum cadastro nos últimos 14 dias. Faça um de teste numa aba anônima." });

  const msgCfg = (await db().doc("config/messaging").get()).data();
  add({ id: "whatsapp", label: "WhatsApp do Lyvo cadastrado", status: msgCfg?.senderNumber ? "ok" : "warn", link: "messages?tab=settings",
    detail: msgCfg?.senderNumber ? `Número +${msgCfg.senderNumber} · assinando como ${msgCfg.senderName || "—"}.` : "Cadastre em Mensagens → Configurar WhatsApp." });

  const errs = await db().collection("webhookErrors").where("at", ">=", TS.fromMillis(now - 7 * DAY)).get();
  add({ id: "errors", label: "Erros de integração (7 dias)", status: errs.empty ? "ok" : "warn", link: "gateways",
    detail: errs.empty ? "Nenhum." : `${errs.size} erro(s). Último: ${String(errs.docs.map((d) => d.data()).sort((a, b) => (ms(b.at) || 0) - (ms(a.at) || 0))[0]?.error || "").slice(0, 160)}` });
  return { at: now, checks };
}

function maxT(...t: (number | null | undefined)[]): number | null {
  const v = t.filter((x): x is number => typeof x === "number" && !isNaN(x));
  return v.length ? Math.max(...v) : null;
}

/** Quem tem acesso (trial, pagante, cortesia) e sumiu, por faixa de dias sem abrir o app. */
function inactiveBuckets(users: any[], now: number) {
  const base = users.filter((u) => u.hasAccess && !u.isAdmin && !u.blocked);
  const days = (u: any) => (u.lastActiveAt ? (now - u.lastActiveAt) / DAY : 999);
  return {
    withAccess: base.length,
    d3: base.filter((u) => days(u) >= 3 && days(u) < 7).length,
    d7: base.filter((u) => days(u) >= 7 && days(u) < 14).length,
    d14: base.filter((u) => days(u) >= 14 && days(u) < 30).length,
    d30: base.filter((u) => days(u) >= 30).length,
    paying: base.filter((u) => ["active", "past_due", "canceled"].includes(u.status) && days(u) >= 7).length,
  };
}

// ─── custos de operação ──────────────────────────────────────────────────────
type CostsConfig = {
  usdBrl: number;
  /** taxa do gateway: % sobre o valor + R$ fixo por pagamento */
  fees: Record<string, { pct: number; fixed: number }>;
  /** custos fixos mensais em R$ (Vercel, domínio, chip etc.) */
  fixed: { id: string; name: string; amountBrl: number }[];
  /** fatura do Google Cloud/Firebase por mês (R$), copiada do console de faturamento */
  cloudBills: Record<string, number>;
};
const DEFAULT_COSTS: CostsConfig = {
  usdBrl: 5.4,
  fees: { olimpopay: { pct: 0, fixed: 0 }, lastlink: { pct: 0, fixed: 0 } },
  fixed: [],
  cloudBills: {},
};
async function getCostsConfig(): Promise<CostsConfig> {
  const c = (await db().doc("config/costs").get()).data() || {};
  return { ...DEFAULT_COSTS, ...c, fees: { ...DEFAULT_COSTS.fees, ...(c.fees || {}) } } as CostsConfig;
}

/** Início do mês (BRT) em ms para "YYYY-MM". */
const monthStart = (m: string) => Date.parse(`${m}-01T03:00:00Z`);
const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; };
const prevMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`; };

async function costs() {
  const cfg = await getCostsConfig();
  const now = Date.now();
  const cur = brParts(now).month;
  const months = [cur, prevMonth(cur), prevMonth(prevMonth(cur))];
  const from = monthStart(months[2]);
  const evSnap = await db().collection("billingEvents").where("receivedAt", ">=", TS.fromMillis(from)).get();
  const events = evSnap.docs.map((d) => d.data()).filter((e) => !e.isTest && e.revenue);
  const users = await loadUsers();
  const emailOf = new Map(users.map((u) => [u.uid, u.email]));
  const fixedTotal = cfg.fixed.reduce((s, f) => s + (Number(f.amountBrl) || 0), 0);

  const out = [];
  for (const m of months) {
    const a = (await db().doc(`aiUsage/${m}`).get()).data() || {};
    const aiUsers = await db().collection(`aiUsage/${m}/users`).orderBy("costUsd", "desc").get();
    const start = monthStart(m), end = monthStart(nextMonth(m));
    const evs = events.filter((e) => { const t = ms(e.receivedAt) || 0; return t >= start && t < end; });
    const revenue = evs.reduce((s, e) => s + Number(e.revenue || 0), 0);
    const byProvider: Record<string, { revenue: number; payments: number; fee: number }> = {};
    for (const e of evs) {
      const p = (byProvider[e.provider] ||= { revenue: 0, payments: 0, fee: 0 });
      p.revenue += Number(e.revenue || 0);
      if (Number(e.revenue) > 0) p.payments += 1;
    }
    let fees = 0;
    for (const [prov, v] of Object.entries(byProvider)) {
      const f = cfg.fees[prov] || { pct: 0, fixed: 0 };
      v.fee = Math.max(0, v.revenue) * (Number(f.pct) || 0) / 100 + v.payments * (Number(f.fixed) || 0);
      fees += v.fee;
    }
    const aiUsd = Number(a.costUsd || 0);
    const ai = aiUsd * cfg.usdBrl;
    const cloud = cfg.cloudBills?.[m] ?? null;
    const total = ai + fees + fixedTotal + (cloud || 0);
    const isCurrent = m === cur;
    const elapsedDays = isCurrent ? Math.max(1, (now - start) / DAY) : null;
    const monthDays = (end - start) / DAY;
    out.push({
      month: m, isCurrent,
      ai: { calls: a.calls || 0, images: a.images || 0, errors: a.errors || 0, inTok: a.inTok || 0, outTok: a.outTok || 0, usd: aiUsd, brl: ai,
        projectedBrl: isCurrent && elapsedDays ? (ai / elapsedDays) * monthDays : null,
        users: aiUsers.size, perCallBrl: a.calls ? ai / a.calls : 0, perUserBrl: aiUsers.size ? ai / aiUsers.size : 0,
        top: aiUsers.docs.slice(0, 10).map((d) => ({ uid: d.id, email: emailOf.get(d.id) || d.id, calls: d.get("calls") || 0, brl: (d.get("costUsd") || 0) * cfg.usdBrl })) },
      revenue, fees, byProvider, fixed: fixedTotal, cloud, total, margin: revenue - total,
    });
  }
  return { config: cfg, model: AI_MODEL, price: AI_PRICE, months: out };
}

async function saveCosts(req: CallableRequest, d: any) {
  const c = d.config || {};
  const clean: CostsConfig = {
    usdBrl: Math.max(1, Math.min(20, Number(c.usdBrl) || DEFAULT_COSTS.usdBrl)),
    fees: Object.fromEntries(Object.entries(c.fees || {}).map(([k, v]: any) => [k, { pct: Math.max(0, Math.min(30, Number(v?.pct) || 0)), fixed: Math.max(0, Math.min(50, Number(v?.fixed) || 0)) }])),
    fixed: (Array.isArray(c.fixed) ? c.fixed : []).slice(0, 30).map((f: any, i: number) => ({ id: String(f.id || `f${i}`), name: String(f.name || "").slice(0, 60), amountBrl: Math.max(0, Number(f.amountBrl) || 0) })).filter((f: any) => f.name),
    cloudBills: Object.fromEntries(Object.entries(c.cloudBills || {}).filter(([k]) => /^\d{4}-\d{2}$/.test(k)).map(([k, v]) => [k, Math.max(0, Number(v) || 0)])),
  };
  await db().doc("config/costs").set({ ...clean, updatedAt: FV.serverTimestamp() });
  await audit(req, "save_costs", null, { reason: d.reason || "Custos atualizados" });
  return { ok: true };
}

async function listAudit(d: any) {
  const s = await db().collection("adminAudit").orderBy("at", "desc").limit(Math.min(Number(d.limit) || 300, 1000)).get();
  return s.docs.map((x) => ({ id: x.id, ...x.data(), at: ms(x.data().at) }));
}

/** Recalcula contadores de uso de todos (para dados anteriores aos triggers). */
async function recomputeUsage(req: CallableRequest) {
  const users = await db().collection("users").get();
  let n = 0;
  for (const u of users.docs) {
    // só a data de criação de cada registro: dá contagem, primeiro e último registro sem índice composto
    const [tx, ev] = await Promise.all([
      db().collection("transactions").where("uid", "==", u.id).select("createdAt").get(),
      db().collection("events").where("uid", "==", u.id).where("source", "==", "INTERNAL").select("createdAt").get(),
    ]);
    const times = [...tx.docs, ...ev.docs].map((d) => ms(d.get("createdAt"))).filter((t): t is number => !!t);
    const usage: any = { transactions: tx.size, events: ev.size };
    if (times.length) {
      usage.firstTxAt = TS.fromMillis(Math.min(...times));
      usage.lastTxAt = TS.fromMillis(Math.max(...times));
    }
    await u.ref.set({ usage }, { merge: true });
    n++;
  }
  await audit(req, "recompute_usage", null, { params: { users: n } });
  return { ok: true, users: n };
}

export const adminApi = onCall({ timeoutSeconds: 120, memory: "512MiB", secrets: [OLIMPO_API_KEY] }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Faça login");
  if (!isAdmin(req)) throw new HttpsError("permission-denied", "Acesso restrito a administradores");
  const d = req.data || {};
  switch (d.action) {
    case "whoami": return { email: req.auth.token.email, uid: req.auth.uid };
    case "overview": return overview();
    case "listUsers": return loadUsers();
    case "getUser": return getUser(String(d.uid));
    case "userAction": return userAction(req, d);
    case "listBilling": return listBilling(d);
    case "getEventRaw": return getEventRaw(String(d.id));
    case "linkEvent": return linkEvent(req, d);
    case "getConfig": return getBillingConfig();
    case "saveConfig": return saveConfig(req, d);
    case "gateways": return gateways();
    case "rotateToken": return rotateToken(req, d);
    case "setNativeSecret": return setNativeSecret(req, d);
    case "dryRun": return dryRun(d);
    case "listAudit": return listAudit(d);
    case "recomputeUsage": return recomputeUsage(req);
    case "getMessaging": {
      const s = await db().doc("config/messaging").get();
      return s.exists ? s.data() : null; // null = o painel usa os modelos padrão
    }
    case "saveMessaging": {
      const c = d.config || {};
      if (!Array.isArray(c.templates)) throw new HttpsError("invalid-argument", "Modelos inválidos");
      const clean = {
        senderNumber: String(c.senderNumber || "").replace(/\D/g, "").slice(0, 15),
        senderName: String(c.senderName || "").slice(0, 60),
        dedupDays: Math.max(1, Math.min(60, Number(c.dedupDays) || 5)),
        requireOptIn: !!c.requireOptIn,
        templates: c.templates.slice(0, 60).map((t: any) => ({
          id: String(t.id).slice(0, 40), stage: String(t.stage).slice(0, 40), name: String(t.name || "").slice(0, 80),
          body: String(t.body || "").slice(0, 2000), active: t.active !== false,
        })),
        updatedAt: FV.serverTimestamp(),
      };
      await db().doc("config/messaging").set(clean);
      await audit(req, "save_messaging", null, { reason: d.reason || null, params: { templates: clean.templates.length } });
      return { ok: true };
    }
    case "logMessage": {
      const uid = String(d.uid || "");
      const u = (await db().collection("users").doc(uid).get()).data();
      if (!u) throw new HttpsError("not-found", "Usuário não encontrado");
      const ref = await db().collection("messageLog").add({
        uid, email: u.email || null, name: u.name || null, stage: String(d.stage || ""), templateId: String(d.templateId || ""),
        channel: "whatsapp_manual", preview: String(d.preview || "").slice(0, 300),
        by: req.auth.token.email || req.auth.uid, at: FV.serverTimestamp(),
      });
      await db().collection("users").doc(uid).set({ lastContactAt: FV.serverTimestamp() }, { merge: true });
      return { ok: true, id: ref.id };
    }
    case "listMessageLog": {
      const s = await db().collection("messageLog").orderBy("at", "desc").limit(Math.min(Number(d.limit) || 1000, 3000)).get();
      return s.docs.map((x) => ({ id: x.id, ...x.data(), at: ms(x.data().at) }));
    }
    case "olimpoPing": {
      try { await olimpoPing(OLIMPO_API_KEY.value()); return { ok: true }; }
      catch (e: any) { return { ok: false, error: String(e?.message || e), status: e?.status ?? null }; }
    }
    case "health": return health();
    case "costs": return costs();
    case "saveCosts": return saveCosts(req, d);
    case "olimpoSyncAll": {
      const r = await olimpoSync(OLIMPO_API_KEY.value(), null);
      await db().doc("systemStatus/olimpoSync").set({ ...r, at: FV.serverTimestamp(), source: "admin" });
      await audit(req, "olimpo_sync_all", null, { params: r });
      return r;
    }
    default: throw new HttpsError("invalid-argument", `Ação desconhecida: ${d.action}`);
  }
});
