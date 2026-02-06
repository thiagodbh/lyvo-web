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
