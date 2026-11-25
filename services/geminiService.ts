import { getFunctions, httpsCallable } from "firebase/functions";
import "./firebase"; // garante initializeApp

/**
 * Envia o comando ao assistente. Roda na função `aiAssistant` do Firebase:
 * exige login, aplica limite diário e registra o custo de cada chamada.
 */
export async function processUserCommand(text: string, imageBase64?: string) {
  const today = new Date();
  const dateContext = `Hoje é ${today.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. `;
  const body = { text: dateContext + text, imageBase64 };

  try {
    const r: any = (await httpsCallable(getFunctions(), "aiAssistant", { timeout: 25000 })(body)).data;
    return { message: r.message, data: r.data };
  } catch (err: any) {
    const code = String(err?.code || "");
    // função ainda não publicada: usa o endpoint antigo enquanto isso
    if (code.endsWith("not-found")) return legacyCall(body);
    if (code.endsWith("deadline-exceeded")) throw new Error("Tempo limite excedido. Tente novamente.");
    throw new Error(err?.message || "Não consegui processar agora. Tente novamente.");
  }
}

async function legacyCall(body: { text: string; imageBase64?: string }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(`Erro na API: ${payload?.details || payload?.error || res.status}`);
    return { message: payload.message, data: payload.data };
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Tempo limite excedido. Tente novamente.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
