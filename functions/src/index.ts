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

// Por enquanto: só valida se existe conexão salva.
export const googleSync = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado");
  }

  const uid = request.auth.uid;
  const snap = await admin.firestore().collection("googleConnections").doc(uid).get();

  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Google não conectado");
  }

  return { success: true };
});