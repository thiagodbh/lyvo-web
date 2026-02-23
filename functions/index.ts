import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const lastlinkWebhook = functions.https.onRequest(async (req, res) => {
    // 1. Verificação de segurança (Opcional, mas profissional)
    // Se a LastLink enviar um Token de segurança, valide-o aqui.

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
            console.log(`Usuário com e-mail ${email} ainda não cadastrado no app.`);
            res.status(200).send("Aguardando cadastro do usuário no app."); 
            return;
        }

        // 2. Lógica de Liberação ou Bloqueio
        let isActive = false;
        if (status === "approved" || status === "active") {
            isActive = true;
        }

        // 3. Atualiza todos os documentos encontrados com esse e-mail
        const batch = admin.firestore().batch();
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { active: isActive });
        });
        
        await batch.commit();
        console.log(`Status de ${email} atualizado para active: ${isActive}`);
        
        res.status(200).send("Webhook processado com sucesso.");
    } catch (error) {
        console.error("Erro ao processar Webhook:", error);
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
