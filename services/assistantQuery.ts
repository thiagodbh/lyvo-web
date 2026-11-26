// Respostas do assistente às perguntas do usuário.
// A IA só interpreta a pergunta e devolve um filtro (QueryDetails); TODA conta é feita aqui,
// em cima dos dados do próprio usuário — números exatos, sem a IA inventar valores.
// Módulo puro (sem Firebase) para poder ser testado isolado.
import type { BudgetLimit, CalendarEvent, CreditCard, FixedBill, Forecast, Transaction } from '../types';

export type QueryIntent =
  | 'SPENDING' | 'INCOME' | 'BALANCE' | 'LIST' | 'BY_CATEGORY' | 'TOP_EXPENSES'
  | 'CARD' | 'BUDGET' | 'BILLS' | 'FORECASTS' | 'AGENDA' | 'SUMMARY' | 'COMPARE';

export type QueryDetails = {
  intent: QueryIntent;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD (inclusive)
  category?: string;
  search?: string;
  cardName?: string;
  eventKind?: 'ALL' | 'EVENT' | 'TASK' | 'REMINDER';
  limit?: number;
};

export type AssistantData = {
  transactions: Transaction[];
  creditCards: CreditCard[];
  fixedBills: FixedBill[];
  forecasts: Forecast[];
  budgetLimits: BudgetLimit[];
  events: CalendarEvent[];
};

// ─── utilidades ──────────────────────────────────────────────────────────────
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Data do registro em YYYY-MM-DD, aceitando "YYYY-MM-DD" ou ISO completo (no fuso local). */
const dayOf = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : (() => { const d = new Date(s); return isNaN(d.getTime()) ? String(s).slice(0, 10) : ymd(d); })());
const fmtDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${pad(d)}/${pad(m)}`; };
const val = (t: { value: any }) => (isNaN(Number(t.value)) ? 0 : Number(t.value));
const isInvoicePayment = (t: Transaction) => /PGTO_/.test(t.description || '');
const isCardResidual = (t: Transaction) => /^Resíduo Fatura Anterior/.test(t.description || '');

/** Período padrão: mês atual. Corrige datas invertidas ou ausentes. */
/**
 * Lê uma data que a IA mandou, aceitando formatos tortos:
 * "2026-11-05", "2026-11-05T10:00", "2026-11" (mês inteiro), "05/11/2026", "5/11".
 * Devolve [início, fim] em YYYY-MM-DD, ou null se não der para entender.
 */
function parseLoose(raw: any, today: Date): [string, string] | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const valid = (y: number, m: number, d: number) => {
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? ymd(dt) : null;
  };
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) { const v = valid(+m[1], +m[2], +m[3]); return v ? [v, v] : (() => { const last = new Date(+m![1], +m![2], 0); return +m![3] > last.getDate() ? [ymd(last), ymd(last)] as [string, string] : null; })(); }
  m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) { const y = +m[1], mo = +m[2]; if (mo < 1 || mo > 12) return null; return [ymd(new Date(y, mo - 1, 1)), ymd(new Date(y, mo, 0))]; }
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) { const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today.getFullYear(); const v = valid(y, +m[2], +m[1]); return v ? [v, v] : null; }
  return null;
}

/** Período da consulta. Padrão: mês atual. Sempre devolve datas válidas, mesmo se a IA errar o formato. */
export function resolveRange(q: QueryDetails, today: Date) {
  const first = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
  const last = ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const a = parseLoose(q.startDate, today);
  const b = parseLoose(q.endDate, today);
  let start: string, end: string;
  if (a && b) { start = a[0]; end = b[1]; }
  else if (a) {
    start = a[0]; end = a[1];
    // só o dia 1º sem fim: a IA quis dizer o mês inteiro ("em novembro")
    if (start === end && start.endsWith('-01')) end = ymd(new Date(+start.slice(0, 4), +start.slice(5, 7), 0));
  }
  else if (b) { start = first; end = b[1]; }
  else { start = first; end = last; }
  if (end < start) [start, end] = [end, start];
  return { start, end };
}

export function describeRange(start: string, end: string, today: Date) {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const lastDay = new Date(ey, em, 0).getDate();
  if (start === end) return start === ymd(today) ? 'hoje' : `em ${fmtDay(start)}`;
  if (sy === ey && sm === em && sd === 1 && ed === lastDay) {
    if (sy === today.getFullYear() && sm === today.getMonth() + 1) return 'este mês';
    return `em ${MONTHS[sm - 1]}${sy !== today.getFullYear() ? ` de ${sy}` : ''}`;
  }
  return `de ${fmtDay(start)} a ${fmtDay(end)}`;
}

const matchCategory = (t: { category?: string }, cat?: string) => !cat || norm(t.category) === norm(cat) || norm(t.category).includes(norm(cat));
/**
 * Palavra-chave: procura SÓ na descrição do lançamento (ex.: "almoço" não traz "padaria",
 * mesmo que os dois estejam em Alimentação). Aceita sem acento e singular/plural.
 */
const matchSearch = (t: { description?: string }, s?: string) => {
  if (!s) return true;
  const desc = norm(t.description);
  return norm(s).split(/\s+/).filter(Boolean).every((w) => desc.includes(w) || (w.length > 3 && w.endsWith('s') && desc.includes(w.slice(0, -1))));
};
function findCard(cards: CreditCard[], name?: string) {
  if (!name) return null;
  const n = norm(name);
  return cards.find((c) => norm(c.name) === n) || cards.find((c) => norm(c.name).includes(n) || n.includes(norm(c.name))) || null;
}

/**
 * Despesas de consumo no período: gastos à vista + compras no cartão (pela data da compra).
 * Fica de fora o pagamento de fatura (senão a compra no cartão contaria duas vezes) e o resíduo de fatura.
 */
function expensesIn(d: AssistantData, start: string, end: string, q: QueryDetails) {
  const card = findCard(d.creditCards, q.cardName);
  return d.transactions.filter((t) => {
    if (t.type !== 'EXPENSE' || isInvoicePayment(t) || isCardResidual(t)) return false;
    const day = dayOf(t.date);
    if (day < start || day > end) return false;
    if (q.cardName && (!card || t.relatedCardId !== card.id)) return false;
    return matchFilters(t, q);
  });
}
/** Categoria e busca: se vierem as duas, basta bater uma (a IA chuta a categoria padrão e o usuário usa outra). */
function matchFilters(t: Transaction, q: QueryDetails) {
  return matchCategory(t, q.category) && matchSearch(t, q.search);
}

/**
 * Palavra-chave e categoria juntas: vale a palavra-chave (é o que a pessoa escreveu).
 * Só se nenhum lançamento do período tiver a palavra na descrição é que cai para a categoria — e avisa.
 */
function resolveFilters(q: QueryDetails, d: AssistantData, start: string, end: string): { q: QueryDetails; note: string } {
  if (!q.search) return { q, note: '' };
  const inRange = d.transactions.filter((t) => { const day = dayOf(t.date); return day >= start && day <= end; });
  const hasKeyword = inRange.some((t) => matchSearch(t, q.search));
  if (hasKeyword || !q.category) return { q: { ...q, category: undefined }, note: '' };
  return { q: { ...q, search: undefined }, note: `Não achei "${q.search}" na descrição dos lançamentos, então somei a categoria ${q.category}.\n\n` };
}
function incomesIn(d: AssistantData, start: string, end: string, q: QueryDetails) {
  return d.transactions.filter((t) => {
    if (t.type !== 'INCOME') return false;
    const day = dayOf(t.date);
    return day >= start && day <= end && matchFilters(t, q);
  });
}
const sum = (xs: { value: any }[]) => xs.reduce((s, t) => s + val(t), 0);

function groupByCategory(xs: Transaction[]) {
  const m = new Map<string, number>();
  for (const t of xs) { const c = (t.category || 'Outros').trim(); m.set(c, (m.get(c) || 0) + val(t)); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const line = (t: Transaction, cards: CreditCard[]) => {
  const card = t.relatedCardId ? cards.find((c) => c.id === t.relatedCardId) : null;
  return `• ${fmtDay(dayOf(t.date))} ${t.description || t.category} — ${money(val(t))}${card ? ` (💳 ${card.name.trim()})` : ''}`;
};
const filterLabel = (q: QueryDetails, d: AssistantData) => {
  const parts: string[] = [];
  if (q.category) parts.push(`em ${q.category}`);
  if (q.search) parts.push(`com "${q.search}"`);
  if (q.cardName) { const c = findCard(d.creditCards, q.cardName); parts.push(`no cartão ${c?.name || q.cardName}`); }
  return parts.length ? ' ' + parts.join(' ') : '';
};

/** Ocorrências de eventos no período, expandindo os recorrentes (dias da semana). */
export function eventsIn(events: CalendarEvent[], start: string, end: string, kind: QueryDetails['eventKind'] = 'ALL') {
  const out: { ev: CalendarEvent; day: string; time: string }[] = [];
  for (const ev of events) {
    const t = ev.type || 'EVENT';
    if (kind && kind !== 'ALL' && t !== kind) continue;
    const dt = new Date(ev.dateTime);
    if (isNaN(dt.getTime())) continue;
    const time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    const base = ymd(dt);
    if (ev.recurringDays?.length) {
      const from = base > start ? base : start;
      const to = ev.recurringEndDate && ev.recurringEndDate < end ? ev.recurringEndDate : end;
      for (let d = new Date(from + 'T12:00:00'); ymd(d) <= to; d.setDate(d.getDate() + 1)) {
        const day = ymd(d);
        if (ev.recurringDays.includes(d.getDay()) && !(ev.recurringExceptions || []).includes(day)) out.push({ ev, day, time });
      }
    } else if (base >= start && base <= end) out.push({ ev, day: base, time });
  }
  return out.sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
}

const monthKey = (day: string) => day.slice(0, 7);

// ─── respostas ───────────────────────────────────────────────────────────────
export function answerQuery(q0: QueryDetails, d: AssistantData, today = new Date()): string {
  const { start, end } = resolveRange(q0, today);
  const { q, note } = q0.intent === 'AGENDA' ? { q: q0, note: '' } : resolveFilters(q0, d, start, end);
  return note + answer(q, d, today, start, end);
}

function answer(q: QueryDetails, d: AssistantData, today: Date, start: string, end: string): string {
  const when = describeRange(start, end, today);
  const limit = Math.max(1, Math.min(30, Number(q.limit) || 10));

  switch (q.intent) {
    case 'SPENDING': {
      const xs = expensesIn(d, start, end, q);
      if (!xs.length) return `Não encontrei gastos${filterLabel(q, d)} ${when}. 🙌`;
      const total = sum(xs);
      const card = sum(xs.filter((t) => t.relatedCardId));
      let msg = `💸 Você gastou ${money(total)}${filterLabel(q, d)} ${when} (${xs.length} lançamento${xs.length > 1 ? 's' : ''}).`;
      if (card > 0 && !q.cardName) msg += Math.abs(card - total) < 0.005 ? '\nTudo no cartão de crédito.' : `\n${money(card)} foi no cartão de crédito.`;
      if (!q.category && !q.search) {
        const top = groupByCategory(xs).slice(0, 3);
        if (top.length > 1) msg += `\n\nOnde mais pesou:\n${top.map(([c, v]) => `• ${c}: ${money(v)}`).join('\n')}`;
      } else {
        msg += `\n\n${xs.slice(0, 5).map((t) => line(t, d.creditCards)).join('\n')}${xs.length > 5 ? `\n…e mais ${xs.length - 5}.` : ''}`;
      }
      return msg;
    }
    case 'INCOME': {
      const xs = incomesIn(d, start, end, q);
      if (!xs.length) return `Não encontrei receitas${filterLabel(q, d)} ${when}.`;
      return `💰 Você recebeu ${money(sum(xs))}${filterLabel(q, d)} ${when}.\n\n${xs.slice(0, 6).map((t) => line(t, d.creditCards)).join('\n')}${xs.length > 6 ? `\n…e mais ${xs.length - 6}.` : ''}`;
    }
    case 'BALANCE': {
      const inc = sum(incomesIn(d, start, end, {} as QueryDetails));
      const exp = sum(expensesIn(d, start, end, {} as QueryDetails));
      const res = inc - exp;
      return `📊 ${when[0].toUpperCase() + when.slice(1)}:\n• Entrou: ${money(inc)}\n• Saiu: ${money(exp)}\n• ${res >= 0 ? 'Sobrou' : 'Faltou'}: ${money(Math.abs(res))}${res < 0 ? ' ⚠️' : ' ✅'}`;
    }
    case 'LIST': {
      const xs = [...expensesIn(d, start, end, q), ...(q.search || q.category ? incomesIn(d, start, end, q) : [])]
        .sort((a, b) => dayOf(b.date).localeCompare(dayOf(a.date)));
      if (!xs.length) return `Não encontrei lançamentos${filterLabel(q, d)} ${when}.`;
      return `🧾 Lançamentos${filterLabel(q, d)} ${when}:\n${xs.slice(0, limit).map((t) => line(t, d.creditCards)).join('\n')}${xs.length > limit ? `\n…e mais ${xs.length - limit}.` : ''}\n\nTotal: ${money(sum(xs.filter((t) => t.type === 'EXPENSE')))} em gastos.`;
    }
    case 'BY_CATEGORY': {
      const xs = expensesIn(d, start, end, { ...q, category: undefined });
      if (!xs.length) return `Sem gastos ${when} ainda.`;
      const total = sum(xs);
      const g = groupByCategory(xs);
      return `📂 Seus gastos por categoria ${when}:\n${g.map(([c, v]) => `• ${c}: ${money(v)} (${Math.round((v / total) * 100)}%)`).join('\n')}\n\nTotal: ${money(total)}`;
    }
    case 'TOP_EXPENSES': {
      const xs = expensesIn(d, start, end, q).sort((a, b) => val(b) - val(a)).slice(0, Math.min(limit, 10));
      if (!xs.length) return `Sem gastos${filterLabel(q, d)} ${when}.`;
      return `🔝 Maiores gastos${filterLabel(q, d)} ${when}:\n${xs.map((t) => line(t, d.creditCards)).join('\n')}`;
    }
    case 'CARD': {
      const month = monthKey(q.startDate ? start : ymd(today));
      const m = Number(month.slice(5));
      const cards = q.cardName ? [findCard(d.creditCards, q.cardName)].filter(Boolean) as CreditCard[] : d.creditCards;
      if (!cards.length) return q.cardName ? `Não achei o cartão "${q.cardName}". Seus cartões: ${d.creditCards.map((c) => c.name).join(', ') || 'nenhum cadastrado'}.` : 'Você ainda não tem cartões cadastrados.';
      const nextKey = (k: string) => { const [yy, mm] = k.split('-').map(Number); return mm === 12 ? `${yy + 1}-01` : `${yy}-${pad(mm + 1)}`; };
      const blocks = cards.map((c) => {
        const inv = (k: string) => sum(d.transactions.filter((t) => t.relatedCardId === c.id && (t as any).billingMonth === k));
        const isPaid = (k: string) => (c.paidInvoices || []).includes(k);
        const total = inv(month);
        const lines = [`💳 ${c.name} — fatura de ${MONTHS[m - 1]}: ${money(total)}${isPaid(month) ? ' (paga ✅)' : ` · vence dia ${pad(c.dueDay)}`}`];
        // fatura do mês já paga: o que interessa é a próxima, que está aberta
        if (isPaid(month) && !q.startDate) {
          const nk = nextKey(month);
          lines.push(`Próxima fatura (${MONTHS[Number(nk.slice(5)) - 1]}): ${money(inv(nk))} até agora · vence dia ${pad(c.dueDay)}`);
        }
        // limite comprometido = tudo que ainda não foi pago, inclusive parcelas futuras (como o banco calcula)
        const used = sum(d.transactions.filter((t) => t.relatedCardId === c.id && (t as any).billingMonth >= monthKey(ymd(today)) && !isPaid((t as any).billingMonth)));
        if (c.limit) lines.push(`Limite livre: ${money(Math.max(0, c.limit - used))} de ${money(c.limit)} (já descontando parcelas futuras)`);
        return lines.join('\n');
      });
      return blocks.join('\n\n');
    }
    case 'BUDGET': {
      const lims = q.category ? d.budgetLimits.filter((b) => matchCategory(b, q.category)) : d.budgetLimits;
      if (!lims.length) return q.category ? `Você não tem limite definido para ${q.category}. Dá para criar na aba Finanças.` : 'Você ainda não definiu limites de gasto. Dá para criar na aba Finanças.';
      const first = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
      const last = ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      const rows = lims.map((b) => {
        const spent = sum(expensesIn(d, first, last, { intent: 'SPENDING', category: b.category }));
        const p = b.monthlyLimit ? spent / b.monthlyLimit : 0;
        const icon = p >= 1 ? '🔴' : p >= 0.8 ? '🟡' : '🟢';
        return `${icon} ${b.category}: ${money(spent)} de ${money(b.monthlyLimit)} (${Math.round(p * 100)}%)${p >= 1 ? ' — estourou' : p >= 0.8 ? ' — perto do limite' : ''}`;
      });
      return `🎯 Seus limites este mês:\n${rows.join('\n')}`;
    }
    case 'BILLS': {
      const month = monthKey(q.startDate ? start : ymd(today));
      const m = Number(month.slice(5));
      const bills = d.fixedBills.filter((b) => month >= b.startMonth && !(b.endedAt && month > b.endedAt) && !(b.skippedMonths || []).includes(month))
        .map((b) => ({ ...b, ...(b.overrides?.[month] || {}) }));
      if (!bills.length) return 'Você não tem contas fixas cadastradas.';
      const open = bills.filter((b) => !(b.paidMonths || []).includes(month)).sort((a, b) => a.dueDay - b.dueDay);
      const paid = bills.filter((b) => (b.paidMonths || []).includes(month));
      const todayDay = month === monthKey(ymd(today)) ? today.getDate() : 0;
      let msg = `🧾 Contas fixas de ${MONTHS[m - 1]}: ${money(sum(bills.map((b) => ({ value: b.baseValue }))))} no total.`;
      if (open.length) msg += `\n\nA pagar (${money(sum(open.map((b) => ({ value: b.baseValue }))))}):\n${open.map((b) => `• dia ${pad(b.dueDay)} ${b.name.trim()} — ${money(b.baseValue)}${todayDay && b.dueDay < todayDay ? ' ⚠️ atrasada' : ''}`).join('\n')}`;
      else msg += '\n\nTodas pagas ✅';
      if (paid.length && open.length) msg += `\n\nJá pagas: ${paid.map((b) => b.name.trim()).join(', ')}.`;
      return msg;
    }
    case 'FORECASTS': {
      const month = monthKey(q.startDate ? start : ymd(today));
      const fs = d.forecasts.filter((f) => month >= f.startMonth && (f.isRecurring || f.startMonth === month) && !(f.skippedMonths || []).includes(month) && !(f.endedAt && month >= f.endedAt));
      if (!fs.length) return 'Você não tem previsões cadastradas para esse mês.';
      const inc = fs.filter((f) => f.type === 'EXPECTED_INCOME'), exp = fs.filter((f) => f.type === 'EXPECTED_EXPENSE');
      return `🔮 Previsto para ${MONTHS[Number(month.slice(5)) - 1]}:\n• A receber: ${money(sum(inc))}${inc.length ? ` (${inc.map((f) => f.description).join(', ')})` : ''}\n• A pagar: ${money(sum(exp))}${exp.length ? ` (${exp.map((f) => f.description).join(', ')})` : ''}`;
    }
    case 'AGENDA': {
      const occ = eventsIn(d.events, start, end, q.eventKind).filter((o) => matchSearch({ description: `${o.ev.title} ${o.ev.description || ''}` }, q.search));
      const pending = occ.filter((o) => !(o.ev.completed && !o.ev.recurringDays?.length));
      const kind = q.eventKind === 'REMINDER' ? 'lembretes' : q.eventKind === 'TASK' ? 'tarefas' : 'compromissos';
      if (!pending.length) return `📅 Nenhum ${kind.slice(0, -1)}${q.search ? ` com "${q.search}"` : ''} ${when}. Agenda livre!`;
      const byDay = new Map<string, typeof pending>();
      for (const o of pending.slice(0, 40)) byDay.set(o.day, [...(byDay.get(o.day) || []), o]);
      const blocks = [...byDay.entries()].map(([day, xs]) => {
        const dt = new Date(day + 'T12:00:00');
        return `${WEEKDAYS[dt.getDay()]} ${fmtDay(day)}${day === ymd(today) ? ' (hoje)' : ''}\n${xs.map((o) => `• ${o.time} ${o.ev.title}${o.ev.location ? ` — ${o.ev.location}` : ''}`).join('\n')}`;
      });
      return `📅 Seus ${kind} ${when} (${pending.length}):\n\n${blocks.join('\n\n')}`;
    }
    case 'COMPARE': {
      const cur = new Date(today.getFullYear(), today.getMonth(), 1);
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const rng = (d0: Date) => [ymd(d0), ymd(new Date(d0.getFullYear(), d0.getMonth() + 1, 0))];
      const [cs] = rng(cur); const [ps, pe] = rng(prev);
      const ce = ymd(today);
      // compara o mesmo pedaço do mês (até o dia de hoje), senão o mês atual sempre "ganha"
      const pSame = ymd(new Date(prev.getFullYear(), prev.getMonth(), Math.min(today.getDate(), new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate())));
      const a = sum(expensesIn(d, cs, ce, q)), b = sum(expensesIn(d, ps, pSame, q)), full = sum(expensesIn(d, ps, pe, q));
      const diff = a - b;
      return `📈 Até hoje, ${MONTHS[cur.getMonth()]}: ${money(a)}${filterLabel(q, d)}.\nNo mesmo período de ${MONTHS[prev.getMonth()]}: ${money(b)}.\n${diff > 0 ? `Você está gastando ${money(diff)} a mais ⚠️` : diff < 0 ? `Você está gastando ${money(-diff)} a menos 👏` : 'Mesmo ritmo.'}\n\n${MONTHS[prev.getMonth()][0].toUpperCase() + MONTHS[prev.getMonth()].slice(1)} fechou em ${money(full)}.`;
    }
    case 'SUMMARY':
    default:
      return summary(d, today);
  }
}

/** Raio-x do mês: o que um assessor diria olhando os números. */
export function summary(d: AssistantData, today = new Date()): string {
  const first = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastD = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const t = ymd(today);
  const q = {} as QueryDetails;
  const exp = expensesIn(d, first, t, q), inc = incomesIn(d, first, ymd(lastD), q);
  const spent = sum(exp), got = sum(inc);
  const days = today.getDate(), total = lastD.getDate();
  const pace = days ? (spent / days) * total : spent;
  const month = MONTHS[today.getMonth()];
  const lines = [`🧭 Seu ${month} até agora:`, `• Entrou: ${money(got)}`, `• Gastou: ${money(spent)}`, `• No ritmo atual, fecha o mês gastando ~${money(pace)}`];
  const top = groupByCategory(exp)[0];
  if (top) lines.push(`• Onde mais gastou: ${top[0]} (${money(top[1])})`);
  const tips: string[] = [];
  if (got > 0 && pace > got) tips.push(`⚠️ Nesse ritmo você gasta ${money(pace - got)} a mais do que entrou.`);
  for (const b of d.budgetLimits) {
    const s = sum(expensesIn(d, first, t, { intent: 'SPENDING', category: b.category }));
    if (b.monthlyLimit && s >= b.monthlyLimit) tips.push(`🔴 Limite de ${b.category} estourado (${money(s)} de ${money(b.monthlyLimit)}).`);
    else if (b.monthlyLimit && s >= b.monthlyLimit * 0.8) tips.push(`🟡 ${b.category} já em ${Math.round((s / b.monthlyLimit) * 100)}% do limite.`);
  }
  const mk = monthKey(t);
  const openBills = d.fixedBills.filter((b) => mk >= b.startMonth && !(b.endedAt && mk > b.endedAt) && !(b.skippedMonths || []).includes(mk) && !(b.paidMonths || []).includes(mk))
    .map((b) => ({ ...b, ...(b.overrides?.[mk] || {}) }));
  if (openBills.length) tips.push(`🧾 ${openBills.length} conta(s) fixa(s) a pagar: ${money(sum(openBills.map((b) => ({ value: b.baseValue }))))}.`);
  const nowKey = `${t}${pad(today.getHours())}:${pad(today.getMinutes())}`;
  const next = eventsIn(d.events, t, ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)))
    .find((o) => `${o.day}${o.time}` >= nowKey && !o.ev.completed);
  if (next) tips.push(`📅 Próximo compromisso: ${next.ev.title}, ${next.day === t ? 'hoje' : fmtDay(next.day)} às ${next.time}.`);
  return lines.join('\n') + (tips.length ? `\n\n${tips.join('\n')}` : '');
}
