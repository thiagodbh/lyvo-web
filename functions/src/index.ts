import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

export const lastlinkWebhook = functions.https.onRequest(async (req, res) => {
    const { status, customer } = req.body;
    const email = customer?.email;

    if (!email) {
        res.status(400).send("E-mail não encontrado na requisição.");
        return;
    }

    try {
        const usersRef = admin.firestore().collection("users");
        const querySnapshot = await usersRef.where("email", "==", email).get();

        if (querySnapshot.empty) {
            console.log("Usuário com e-mail " + email + " ainda não cadastrado.");
            res.status(200).send("Aguardando cadastro."); 
            return;
        }

        let isActive = (status === "approved" || status === "active");

        const batch = admin.firestore().batch();
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { active: isActive });
        });
        
        await batch.commit();
        res.status(200).send("Webhook processado.");
    } catch (error) {
        res.status(500).send("Erro interno.");
    }
});
// ================= GOOGLE CALENDAR (OAuth + Sync) =================

// Troca "code" por tokens e salva refresh_token no Firestore
export const googleConnect = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado");
  }

  const code = request.data?.code as string | undefined;
  if (!code) {
    throw new HttpsError("invalid-argument", "Code não fornecido");
  }

  // ⚠️ Tipagem do v2 está marcando config() como never no seu projeto.
  // Para não travar o build, usamos cast seguro.
  const cfg = (functions as any).config?.();
  const clientId = cfg?.google?.client_id;
  const clientSecret = cfg?.google?.client_secret;

  if (!clientId || !clientSecret) {
    throw new HttpsError(
      "failed-precondition",
      "Config google.client_id / google.client_secret não encontrada no Firebase."
    );
  }

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
    throw new HttpsError(
      "unknown",
      tokenData?.error_description || tokenData?.error || "Falha ao trocar code por token"
    );
  }

  if (!tokenData.refresh_token) {
    throw new HttpsError(
      "failed-precondition",
      "Refresh token não retornado. Precisamos forçar consentimento no login do Google."
    );
  }

  const uid = request.auth.uid;

  await admin.firestore().collection("googleConnections").doc(uid).set(
    {
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true };
});

// Lista eventos do Google Calendar usando refresh_token salvo no Firestore
export const googleSync = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado");
  }

  const uid = request.auth.uid;
  const snap = await admin.firestore().collection("googleConnections").doc(uid).get();

  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Google não conectado");
  }

  const refreshToken = snap.data()?.refresh_token as string | undefined;
  if (!refreshToken) {
    throw new HttpsError("failed-precondition", "Refresh token ausente");
  }

  // Busca client_id e client_secret do config
  const cfg = (functions as any).config?.();
  const clientId = cfg?.google?.client_id;
  const clientSecret = cfg?.google?.client_secret;

  if (!clientId || !clientSecret) {
    throw new HttpsError(
      "failed-precondition",
      "Config google.client_id / google.client_secret não encontrada no Firebase."
    );
  }

  // 1) refresh_token -> access_token
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
    throw new HttpsError(
      "unknown",
      tokenData?.error_description || tokenData?.error || "Falha ao gerar access_token"
    );
  }

  // 2) lista eventos (padrão: últimos 30 dias até próximos 90 dias)
  const now = new Date();
  const timeMin = (request.data?.timeMin as string | undefined) || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = (request.data?.timeMax as string | undefined) || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?singleEvents=true&orderBy=startTime` +
    `&timeMin=${encodeURIComponent(timeMin)}` +
    `&timeMax=${encodeURIComponent(timeMax)}`;

  const eventsRes = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const eventsData: any = await eventsRes.json();

  if (!eventsRes.ok) {
    throw new HttpsError(
      "unknown",
      eventsData?.error?.message || "Falha ao listar eventos do Google Calendar"
    );
  }

  const items = (eventsData.items || []).map((gEvent: any) => ({
    id: gEvent.id,
    title: gEvent.summary || "(Sem título)",
    dateTime: gEvent.start?.dateTime || gEvent.start?.date || null,
    location: gEvent.location || "",
    description: gEvent.description || "",
    updated: gEvent.updated || null,
  }));

  return { success: true, items };
});
