import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";

admin.initializeApp();

const GOOGLE_CLIENT_ID = defineSecret("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_CLIENT_SECRET");

// ─── Webhook LastLink ───────────────────────────────────────────────────────
export const lastlinkWebhook = onRequest(async (req, res) => {
      const { status, customer } = req.body;
      const email = customer?.email;
      if (!email) { res.status(400).send("E-mail nao encontrado."); return; }
      try {
              const snap = await admin.firestore().collection("users").where("email", "==", email).get();
              if (snap.empty) { res.status(200).send("Aguardando cadastro."); return; }
              const isActive = status === "approved" || status === "active";
              const batch = admin.firestore().batch();
              snap.forEach(d => batch.update(d.ref, { active: isActive }));
              await batch.commit();
              res.status(200).send("OK");
      } catch { res.status(500).send("Erro interno."); }
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
