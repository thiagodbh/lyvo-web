import { getFunctions, httpsCallable } from "firebase/functions";
import "./firebase"; // garante initializeApp
import { store } from "./firestoreStore";

/**
 * Envia o comando ao assistente. Roda na função `aiAssistant` do Firebase:
 * exige login, aplica limite diário e registra o custo de cada chamada.
 */
export async function processUserCommand(text: string, imageBase64?: string) {
  const today = new Date();
  const dateContext = `Hoje é ${today.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. `;
  // v: versão do app — a IA só devolve consultas (QUERY) para quem sabe respondê-las
  const body = { text: dateContext + calendarContext(today) + userContext() + text, imageBase64, v: 2 };

  try {
    const r: any = (await httpsCallable(getFunctions(), "aiAssistant", { timeout: 25000 })(body)).data;
    return { message: r.message, data: r.data };
  } catch (err: any) {
    const code = String(err?.code || "");
    if (code.endsWith("deadline-exceeded")) throw new Error("Tempo limite excedido. Tente novamente.");
    throw new Error(err?.message || "Não consegui processar agora. Tente novamente.");
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Datas já calculadas: a IA erra conta de dia da semana, então entregamos pronto. */
function calendarContext(t: Date) {
  const dow = (t.getDay() + 6) % 7; // segunda = 0
  const mon = new Date(t.getFullYear(), t.getMonth(), t.getDate() - dow);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const lastMon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7);
  const lastSun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 1);
  const m0 = new Date(t.getFullYear(), t.getMonth(), 1), m1 = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  const p0 = new Date(t.getFullYear(), t.getMonth() - 1, 1), p1 = new Date(t.getFullYear(), t.getMonth(), 0);
  const add = (n: number) => iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
  return `[Datas] hoje=${iso(t)}; ontem=${add(-1)}; amanhã=${add(1)}; esta semana=${iso(mon)} a ${iso(sun)}; semana passada=${iso(lastMon)} a ${iso(lastSun)}; próximos 7 dias=${iso(t)} a ${add(7)}; este mês=${iso(m0)} a ${iso(m1)}; mês passado=${iso(p0)} a ${iso(p1)}. `;
}

/** Nomes reais das categorias e cartões do usuário, para a IA filtrar pelo nome certo. */
function userContext() {
  try {
    const cats = [...new Set([...store.transactions.map((t) => (t.category || "").trim()), ...store.budgetLimits.map((b) => (b.category || "").trim())].filter(Boolean))].slice(0, 40);
    const cards = store.creditCards.map((c) => c.name).filter(Boolean).slice(0, 10);
    return `[Usuário] categorias: ${cats.join(", ") || "padrão"}; cartões: ${cards.join(", ") || "nenhum"}. [Mensagem] `;
  } catch { return ""; }
}
