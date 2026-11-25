// Assistente de IA (Gemini) atrás de login, com limite diário e registro de custo de cada chamada.
// Substitui o endpoint aberto api/gemini.ts da Vercel.
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenAI } from "@google/genai";
import { actionSchema, systemInstruction } from "./aiPrompt";
import { hasAccess } from "./billing/engine";

export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const AI_MODEL = "gemini-2.5-flash";
/** US$ por 1 milhão de tokens (tabela pública do Gemini API, plano pago). Atualize se o modelo mudar. */
export const AI_PRICE = { inText: 0.30, inAudio: 1.00, out: 2.50 };
const DAILY_LIMIT = 200; // por usuário — trava abuso e bug em loop

const db = () => admin.firestore();
const FV = admin.firestore.FieldValue;

/** Mês e dia no fuso de Brasília. */
export function brParts(t = Date.now()) {
  const s = new Date(t - 3 * 3600e3).toISOString(); // BRT fixo (sem horário de verão)
  return { month: s.slice(0, 7), day: s.slice(8, 10) };
}

export const aiAssistant = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 30, memory: "512MiB" }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Faça login para usar o assistente.");
  const uid = req.auth.uid;
  const text = String(req.data?.text || "").slice(0, 4000);
  const imageBase64 = req.data?.imageBase64 ? String(req.data.imageBase64) : null;
  if (!text && !imageBase64) throw new HttpsError("invalid-argument", "Mensagem vazia.");
  if (imageBase64 && imageBase64.length > 7_000_000) throw new HttpsError("invalid-argument", "Imagem grande demais.");

  const user = (await db().collection("users").doc(uid).get()).data();
  const isAdmin = req.auth.token?.admin === true;
  if (!isAdmin && !hasAccess(user)) throw new HttpsError("permission-denied", "Seu acesso expirou. Assine para continuar usando o assistente.");

  const { month, day } = brParts();
  const userUsageRef = db().doc(`aiUsage/${month}/users/${uid}`);
  const today = (await userUsageRef.get()).get(`days.${day}`) || 0;
  if (!isAdmin && today >= DAILY_LIMIT) throw new HttpsError("resource-exhausted", "Limite diário do assistente atingido. Volte amanhã.");

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
  const parts: any[] = [];
  if (text) parts.push({ text });
  if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: [{ role: "user", parts }],
      config: { systemInstruction, responseMimeType: "application/json", responseSchema: actionSchema, thinkingConfig: { thinkingBudget: 0 } },
    });
  } catch (e: any) {
    await db().doc(`aiUsage/${month}`).set({ errors: FV.increment(1) }, { merge: true }).catch(() => undefined);
    throw new HttpsError("unavailable", "O assistente está instável agora. Tente de novo em instantes.");
  }

  // custo real da chamada pelos tokens que o Google cobrou
  const um = response.usageMetadata || {};
  const inTok = Number(um.promptTokenCount || 0);
  const outTok = Number(um.candidatesTokenCount || 0) + Number(um.thoughtsTokenCount || 0);
  const costUsd = (inTok * AI_PRICE.inText + outTok * AI_PRICE.out) / 1e6;
  const inc = { calls: FV.increment(1), inTok: FV.increment(inTok), outTok: FV.increment(outTok), costUsd: FV.increment(costUsd), images: FV.increment(imageBase64 ? 1 : 0) };
  await Promise.all([
    db().doc(`aiUsage/${month}`).set({ ...inc, model: AI_MODEL, updatedAt: FV.serverTimestamp() }, { merge: true }),
    userUsageRef.set({ ...inc, uid, days: { [day]: FV.increment(1) }, lastAt: FV.serverTimestamp() }, { merge: true }),
  ]).catch((e) => console.error("aiUsage", e));

  const raw = response.text ?? "";
  try {
    const parsed = JSON.parse(raw);
    return { message: parsed.responseMessage || "Comando processado.", data: parsed };
  } catch {
    return { message: "Houve uma oscilação ao interpretar o comando. Tente novamente.", data: { action: "UNKNOWN" } };
  }
});
