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
    if (code.endsWith("deadline-exceeded")) throw new Error("Tempo limite excedido. Tente novamente.");
    throw new Error(err?.message || "Não consegui processar agora. Tente novamente.");
  }
}
