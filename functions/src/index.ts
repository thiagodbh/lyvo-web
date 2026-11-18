import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();

import { ADAPTERS } from "./billing/adapters";
import { applyPendingAccess, getBillingConfig, hasAccess, processEvent } from "./billing/engine";
import { PROVIDERS, ProviderId } from "./billing/types";
import {
  OLIMPO_API_KEY, OlimpoError, createCheckout, handleWebhook as handleOlimpoWebhook,
  isValidCnpj, isValidCpf, onlyDigits, syncWhere,
} from "./billing/olimpo";
export { adminApi } from "./admin";

const GOOGLE_CLIENT_ID = defineSecret("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_CLIENT_SECRET");

const safeEqual = (a: string, b: string) => {
  const A = Buffer.from(a); const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

// ─── Webhook de cobrança (todos os gateways) ────────────────────────────────
// URL: /billingWebhook/<gateway>?token=<token gerado no admin>
export const billingWebhook = onRequest({ secrets: [OLIMPO_API_KEY] }, async (req, res) => {
  const provider = req.path.replace(/^\/+/, "").split("/")[0] as ProviderId;
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }
  if (!PROVIDERS.includes(provider)) { res.status(404).send("Gateway desconhecido"); return; }

  const secrets = (await admin.firestore().doc("config/billingSecrets").get()).data() || {};
  const token = secrets.tokens?.[provider];
  const native = secrets.native?.[provider];
  const input = { body: req.body || {}, headers: req.headers as any, query: req.query as any, rawBody: req.rawBody };
  const tokenOk = !!token && typeof req.query.token === "string" && safeEqual(req.query.token, token);
  const nativeOk = !!native && !!ADAPTERS[provider].verifyNative?.(input, native);
  if (!tokenOk && !nativeOk) { res.status(401).send("Unauthorized"); return; }

  // Olimpo Pay: webhook só dispara conferência na API (não é assinado, não liberamos acesso pelo payload)
  if (provider === "olimpopay") {
    try {
      const r = await handleOlimpoWebhook(OLIMPO_API_KEY.value(), req.body || {});
      res.status(200).json(r);
    } catch (e: any) {
      await admin.firestore().collection("webhookErrors").add({ provider, at: admin.firestore.FieldValue.serverTimestamp(), error: String(e?.message || e), rawJson: JSON.stringify(req.body).slice(0, 20000) });
      res.status(200).send("Recebido"); // Olimpo não reenvia; o sync de 15 min cobre
    }
    return;
  }

  const cfg = await getBillingConfig();
  if (!cfg.providers[provider]?.enabled) {
    // gateway desligado: registra para auditoria mas não aplica acesso
    await admin.firestore().collection("webhookErrors").add({ provider, at: admin.firestore.FieldValue.serverTimestamp(), error: "gateway desabilitado", rawJson: JSON.stringify(req.body).slice(0, 20000) });
    res.status(200).send("Gateway disabled"); return;
  }
  try {
    const ev = ADAPTERS[provider].normalize(input);
    if (!ev) { res.status(200).send("Ignored"); return; }
    const r = await processEvent(ev, JSON.stringify(req.body), { endpoint: "v2" });
    res.status(200).json(r);
  } catch (e: any) {
    await admin.firestore().collection("webhookErrors").add({ provider, at: admin.firestore.FieldValue.serverTimestamp(), error: String(e?.message || e), rawJson: JSON.stringify(req.body).slice(0, 20000) });
    res.status(500).send("Erro interno"); // gateway tenta de novo
  }
});

// ─── Webhook LastLink antigo (sem token) — só enquanto a URL não for trocada ─
export const lastlinkWebhook = onRequest(async (req, res) => {
  const cfg = await getBillingConfig();
  if (!cfg.allowLegacyLastlink) { res.status(410).send("Endpoint desativado. Use billingWebhook/lastlink."); return; }
  try {
    const ev = ADAPTERS.lastlink.normalize({ body: req.body || {}, headers: req.headers as any, query: req.query as any });
    if (!ev || !ev.email) { res.status(400).send("E-mail nao encontrado."); return; }
    const r = await processEvent(ev, JSON.stringify(req.body), { endpoint: "legacy" });
    res.status(200).json(r);
  } catch (e: any) {
    await admin.firestore().collection("webhookErrors").add({ provider: "lastlink", at: admin.firestore.FieldValue.serverTimestamp(), error: String(e?.message || e), legacy: true });
    res.status(500).send("Erro interno.");
  }
});

// ─── Gatilhos de dados ──────────────────────────────────────────────────────
// Novo cadastro: aplica pagamento feito antes da conta existir.
export const onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
  const data = event.data?.data();
  let email: string | null = data?.email || null;
  if (!email) email = (await admin.auth().getUser(event.params.uid).catch(() => null))?.email || null;
  await applyPendingAccess(event.params.uid, email);
});

const bumpUsage = async (uid: string | undefined, field: "transactions" | "events") => {
  if (!uid) return;
  const ref = admin.firestore().collection("users").doc(uid);
  const now = admin.firestore.Timestamp.now();
  await admin.firestore().runTransaction(async (tx) => {
    const u = (await tx.get(ref)).data() || {};
    const usage: any = { [field]: admin.firestore.FieldValue.increment(1), lastTxAt: now };
    if (!u.usage?.firstTxAt) usage.firstTxAt = now;
    tx.set(ref, { usage, lastActiveAt: now }, { merge: true });
  });
};

export const onTransactionCreated = onDocumentCreated("transactions/{id}", (e) =>
  bumpUsage(e.data?.data()?.uid, "transactions"));

// eventos importados do Google não contam como uso
export const onEventCreated = onDocumentCreated("events/{id}", (e) => {
  const d = e.data?.data();
  return d?.source === "GOOGLE" ? Promise.resolve() : bumpUsage(d?.uid, "events");
});

export const onCalendarConnected = onDocumentCreated("calendarConnections/{id}", async (e) => {
  const uid = e.data?.data()?.uid;
  if (uid) await admin.firestore().collection("users").doc(uid).set({ usage: { googleConnected: true } }, { merge: true });
});

// ─── Rotina diária: vencimentos + foto das métricas ─────────────────────────
export const dailyBillingMaintenance = onSchedule({ schedule: "every day 03:10", timeZone: "America/Sao_Paulo" }, async () => {
  const db = admin.firestore();
  const now = Date.now();
  const cfg = await getBillingConfig();
  const users = await db.collection("users").get();
  let paying = 0; let trials = 0; let mrr = 0; let expiredToday = 0;
  const months: Record<string, number> = { month: 1, quarter: 3, semester: 6, year: 12 };
  for (const d of users.docs) {
    const u = d.data();
    const ok = hasAccess(u, now);
    const st = u.access?.status;
    if (ok && ["active", "past_due", "canceled"].includes(st)) {
      paying++;
      const p = cfg.plans.find((x) => x.id === u.access?.planId);
      if (p && months[p.interval]) mrr += p.price / months[p.interval];
    } else if (ok && (!u.access || st === "trial") && !u.active) trials++;
    // venceu sem renovar → expira e desliga o campo legado
    if (!ok && st && ["active", "past_due", "canceled", "courtesy"].includes(st)) {
      await d.ref.set({ access: { ...u.access, status: "expired", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, active: false }, { merge: true });
      expiredToday++;
    } else if (!ok && !u.access && u.active === true) {
      // nada: usuário antigo sem prazo; mantém
    }
  }
  const day = new Date(now - 3 * 3600e3).toISOString().slice(0, 10);
  await db.collection("metricsDaily").doc(day).set({ users: users.size, paying, trials, mrr, expiredToday, at: admin.firestore.FieldValue.serverTimestamp() });
});

// ─── googleConnect ──────────────────────────────────────────────────────────
export const googleConnect = onCall(
    { secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
      async (request) => {
              if (!request.auth) throw new HttpsError("unauthenticated", "Nao autenticado");

        const code = request.data?.code as string | undefined;
              if (!code) throw new HttpsError("invalid-argument", "Code nao fornecido");

        const clientId = GOOGLE_CLIENT_ID.value();
              const clientSecret = GOOGLE_CLIENT_SECRET.value();

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                              code,
                              client_id: clientId,
                              client_secret: clientSecret,
                              redirect_uri: "postmessage",
                              grant_type: "authorization_code",
                  }),
        });
              const tokenData: any = await tokenRes.json();

        if (!tokenRes.ok) {
                  throw new HttpsError("unknown", tokenData?.error_description || tokenData?.error || "Falha no token");
        }
              if (!tokenData.refresh_token) {
                        throw new HttpsError(
                                    "failed-precondition",
                                    "Refresh token ausente. Use prompt=consent e access_type=offline no frontend."
                                  );
              }

        const uid = request.auth.uid;
              await admin.firestore().collection("googleConnections").doc(uid).set(
                  {
                              refresh_token: tokenData.refresh_token,
                              scope: tokenData.scope,
                              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                      );

        // Atualiza / cria registro em calendarConnections (para a UI)
        const connRef = admin.firestore().collection("calendarConnections");
              const existing = await connRef
                .where("uid", "==", uid)
                .where("source", "==", "GOOGLE")
                .get();

        const payload: any = {
                  uid,
                  source: "GOOGLE",
                  type: "CALENDAR",
                  accountName: "Google Agenda",
                  connectionStatus: "CONNECTED",
                  lastSyncDate: new Date().toISOString(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (existing.empty) {
                  await connRef.add({ ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
                  await existing.docs[0].ref.update(payload);
        }

        return { success: true };
      }
    );

// ─── googleSync ─────────────────────────────────────────────────────────────
export const googleSync = onCall(
    { secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
      async (request) => {
              if (!request.auth) throw new HttpsError("unauthenticated", "Nao autenticado");

        const uid = request.auth.uid;
              const snap = await admin.firestore().collection("googleConnections").doc(uid).get();
              if (!snap.exists) {
                        throw new HttpsError("failed-precondition", "Google nao conectado. Execute googleConnect primeiro.");
              }

        const refreshToken = snap.data()?.refresh_token as string | undefined;
              if (!refreshToken) throw new HttpsError("failed-precondition", "Refresh token ausente");

        const clientId = GOOGLE_CLIENT_ID.value();
              const clientSecret = GOOGLE_CLIENT_SECRET.value();

        // 1) Obter access_token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                              client_id: clientId,
                              client_secret: clientSecret,
                              refresh_token: refreshToken,
                              grant_type: "refresh_token",
                  }),
        });
              const tokenData: any = await tokenRes.json();
              if (!tokenRes.ok || !tokenData.access_token) {
                        throw new HttpsError("unknown", tokenData?.error_description || "Falha ao gerar access_token");
              }

        // 2) Buscar eventos (-30 dias ate +90 dias)
        const now = new Date();
              const timeMin = new Date(now.getTime() - 30 * 864e5).toISOString();
              const timeMax = new Date(now.getTime() + 90 * 864e5).toISOString();

        const url =
                  `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
                  `?singleEvents=true&orderBy=startTime` +
                  `&timeMin=${encodeURIComponent(timeMin)}` +
                  `&timeMax=${encodeURIComponent(timeMax)}`;

        const eventsRes = await fetch(url, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
              const eventsData: any = await eventsRes.json();

        if (!eventsRes.ok) {
                  throw new HttpsError("unknown", eventsData?.error?.message || "Falha ao listar eventos");
        }

        // 3) Persistir eventos no Firestore (upsert por googleEventId)
        const eventsCol = admin.firestore().collection("events");
              const items = eventsData.items || [];

        for (const gEvent of items) {
                  const googleEventId = gEvent.id as string;
                  const dateTime = gEvent.start?.dateTime || gEvent.start?.date || null;
                  if (!dateTime) continue;

                const existing = await eventsCol
                    .where("uid", "==", uid)
                    .where("googleEventId", "==", googleEventId)
                    .limit(1)
                    .get();

                const eventPayload: any = {
                            uid,
                            googleEventId,
                            title: gEvent.summary || "(Sem titulo)",
                            dateTime,
                            location: gEvent.location || "",
                            description: gEvent.description || "",
                            source: "GOOGLE",
                            color: "border-blue-500",
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (existing.empty) {
                            await eventsCol.add({ ...eventPayload, createdAt: admin.firestore.FieldValue.serverTimestamp() });
                } else {
                            await existing.docs[0].ref.update(eventPayload);
                }
        }

        // 4) Atualiza lastSyncDate na conexao
        const connSnap = await admin.firestore().collection("calendarConnections")
                .where("uid", "==", uid).where("source", "==", "GOOGLE").get();
              if (!connSnap.empty) {
                        await connSnap.docs[0].ref.update({
                                    lastSyncDate: new Date().toISOString(),
                                    connectionStatus: "CONNECTED",
                        });
              }

        return { success: true, count: items.length };
      }
    );

// ─── Helpers de token ────────────────────────────────────────────────────────
async function getAccessToken(uid: string, clientId: string, clientSecret: string): Promise<string> {
  const snap = await admin.firestore().collection("googleConnections").doc(uid).get();
  if (!snap.exists) throw new HttpsError("failed-precondition", "Google nao conectado");
  const refreshToken = snap.data()?.refresh_token as string | undefined;
  if (!refreshToken) throw new HttpsError("failed-precondition", "Refresh token ausente");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) throw new HttpsError("unknown", data?.error_description || "Falha ao obter access_token");
  return data.access_token;
}

// ─── googlePushEvent ─────────────────────────────────────────────────────────
export const googlePushEvent = onCall(
  { secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Nao autenticado");
    const uid = request.auth.uid;
    const event = request.data?.event as any;
    if (!event) throw new HttpsError("invalid-argument", "Evento nao fornecido");

    const accessToken = await getAccessToken(uid, GOOGLE_CLIENT_ID.value(), GOOGLE_CLIENT_SECRET.value());

    const startDt = new Date(event.dateTime);
    const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
    const gEvent = {
      summary: event.title || "(Sem titulo)",
      description: event.description || "",
      location: event.location || "",
      start: { dateTime: startDt.toISOString() },
      end: { dateTime: endDt.toISOString() },
    };

    let googleEventId = event.googleEventId as string | null | undefined;

    if (googleEventId) {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(gEvent),
      });
      if (res.status === 404) googleEventId = null;
      else if (!res.ok) { const e: any = await res.json(); throw new HttpsError("unknown", e?.error?.message || "Falha ao atualizar evento"); }
    }

    if (!googleEventId) {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(gEvent),
      });
      const data: any = await res.json();
      if (!res.ok) throw new HttpsError("unknown", data?.error?.message || "Falha ao criar evento");
      googleEventId = data.id;
      if (event.id) await admin.firestore().collection("events").doc(event.id).update({ googleEventId });
    }

    return { success: true, googleEventId };
  }
);

// ─── googleDeleteEvent ───────────────────────────────────────────────────────
export const googleDeleteEvent = onCall(
  { secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Nao autenticado");
    const uid = request.auth.uid;
    const googleEventId = request.data?.googleEventId as string | undefined;
    if (!googleEventId) return { success: true };

    try {
      const accessToken = await getAccessToken(uid, GOOGLE_CLIENT_ID.value(), GOOGLE_CLIENT_SECRET.value());
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch { /* se não conectado ou evento não existe, ignorar */ }

    return { success: true };
  }
);

// ─── sendEventReminders (roda a cada 5 minutos) ──────────────────────────────
export const sendEventReminders = onSchedule("every 5 minutes", async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 5 * 60 * 1000);

  // Busca eventos com lembrete que disparam dentro da janela de 5 minutos
  const snap = await admin.firestore().collection("events")
    .where("reminderMinutes", ">", 0)
    .get();

  for (const docSnap of snap.docs) {
    const ev = docSnap.data();
    if (!ev.dateTime || !ev.reminderMinutes || !ev.uid) continue;

    const eventTime  = new Date(ev.dateTime);
    const reminderAt = new Date(eventTime.getTime() - ev.reminderMinutes * 60 * 1000);

    if (reminderAt < windowStart || reminderAt > windowEnd) continue;

    // Busca FCM token do usuário
    const userDoc = await admin.firestore().collection("users").doc(ev.uid).get();
    const fcmToken = userDoc.data()?.fcmToken as string | undefined;
    if (!fcmToken) continue;

    const minLabel = ev.reminderMinutes < 60
      ? `${ev.reminderMinutes} min`
      : `${ev.reminderMinutes / 60}h`;

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: `⏰ ${ev.title}`,
          body: `Começa em ${minLabel}${ev.location ? ' · ' + ev.location : ''}`,
        },
        data: { eventId: docSnap.id },
        webpush: {
          notification: {
            icon: "https://meulyvo.com/icons/icon-192.png",
            badge: "https://meulyvo.com/icons/badge-96.png",
            requireInteraction: false,
          },
        },
      });
    } catch { /* token inválido ou expirado, ignora */ }
  }
});


// ─── Olimpo Pay: checkout e conferência ─────────────────────────────────────
// Usuário logado pede o link de pagamento. Se a Olimpo falhar, o app cai para o próximo gateway (LastLink).
export const olimpoCheckout = onCall({ secrets: [OLIMPO_API_KEY], timeoutSeconds: 30 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Faça login");
  const uid = req.auth.uid;
  const cfg = await getBillingConfig();
  if (!cfg.providers.olimpopay?.enabled) throw new HttpsError("failed-precondition", "olimpo_disabled");
  const plan = cfg.plans.find((p) => p.id === req.data?.planId && p.active);
  if (!plan) throw new HttpsError("invalid-argument", "Plano inválido");

  const document = onlyDigits(req.data?.document);
  if (!(isValidCpf(document) || isValidCnpj(document))) throw new HttpsError("invalid-argument", "CPF/CNPJ inválido");
  const phone = onlyDigits(req.data?.phone);
  if (phone.length < 10 || phone.length > 11) throw new HttpsError("invalid-argument", "Celular inválido (DDD + número)");

  const userRef = admin.firestore().collection("users").doc(uid);
  const u = (await userRef.get()).data() || {};
  if (u.blocked) throw new HttpsError("permission-denied", "Conta bloqueada");
  const email = String(req.auth.token.email || u.email || "").toLowerCase();
  const name = String(req.data?.name || u.name || "").trim();
  if (!email) throw new HttpsError("failed-precondition", "Conta sem e-mail");
  if (name.length < 3) throw new HttpsError("invalid-argument", "Informe seu nome completo");

  // limite simples contra abuso: 6 links por hora
  const recent = await admin.firestore().collection("subscriptions").where("uid", "==", uid).where("provider", "==", "olimpopay").get();
  const lastHour = recent.docs.filter((d) => (d.data().createdAt?.toMillis?.() || 0) > Date.now() - 3600e3).length;
  if (lastHour >= 6) throw new HttpsError("resource-exhausted", "Muitas tentativas. Tente em alguns minutos.");

  try {
    const r = await createCheckout(OLIMPO_API_KEY.value(), { uid, plan, customer: { name, email, document, phone } });
    // telefone/nome ajudam o suporte; o CPF NÃO é guardado no Lyvo (fica só na Olimpo Pay)
    await userRef.set({ ...(u.phone ? {} : { phone }), ...(u.name ? {} : { name }) }, { merge: true });
    return { url: r.paymentLink, reused: r.reused };
  } catch (e: any) {
    const status = e instanceof OlimpoError ? e.status : 0;
    await admin.firestore().collection("webhookErrors").add({ provider: "olimpopay", at: admin.firestore.FieldValue.serverTimestamp(), error: `checkout: ${e?.message || e}`, status, uid });
    if (status === 422 || status === 400) throw new HttpsError("invalid-argument", e.message || "Dados recusados pela Olimpo Pay");
    throw new HttpsError("unavailable", "olimpo_unavailable"); // app usa o fallback
  }
});

/** "Já paguei": confere na Olimpo e devolve se o acesso já foi liberado. */
export const olimpoSyncMine = onCall({ secrets: [OLIMPO_API_KEY], timeoutSeconds: 60 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Faça login");
  const r = await syncWhere(OLIMPO_API_KEY.value(), "uid", req.auth.uid);
  const u = (await admin.firestore().collection("users").doc(req.auth.uid).get()).data();
  return { ...r, hasAccess: hasAccess(u) };
});

export const olimpoSyncScheduled = onSchedule({ schedule: "every 15 minutes", secrets: [OLIMPO_API_KEY], timeoutSeconds: 300 }, async () => {
  await syncWhere(OLIMPO_API_KEY.value(), null);
});
