// Central de mensagens: etapas do funil, modelos padrão, variáveis e regra de quem entra em cada etapa.
// Tudo é calculado a partir dos mesmos dados do painel (usuários, assinaturas, pagamentos),
// então a fila do dia sempre bate com o que o sistema sabe de cada cliente.

import type { BillingConfig, BillingEvent, Subscription, UserRow } from '../types';

export type StageId =
  | 'checkout_abandoned' | 'past_due' | 'payment_confirmed' | 'renewal_soon' | 'canceled'
  | 'trial_ending' | 'activation' | 'welcome' | 'trial_expired' | 'inactive_paying' | 'winback' | 'referral';

export type Phase = 'Ativação' | 'Conversão' | 'Recuperação' | 'Retenção' | 'Expansão';

export interface Stage {
  id: StageId;
  label: string;
  phase: Phase;
  /** o que esta mensagem precisa conseguir */
  goal: string;
  /** regra em português, mostrada no painel */
  rule: string;
  /** transacional = sobre a conta/pagamento do cliente (pode ir sem opt-in); senão é marketing */
  transactional: boolean;
  /** não repetir a mesma etapa para a mesma pessoa antes de N dias (null = usa o padrão da config) */
  cooldownDays?: number | null;
}

/** Ordem = prioridade. Cada pessoa aparece na fila só na etapa mais importante em que se encaixa. */
export const STAGES: Stage[] = [
  { id: 'checkout_abandoned', label: 'Checkout abandonado', phase: 'Conversão', transactional: true, cooldownDays: 2,
    goal: 'Recuperar quem gerou o pagamento e não concluiu', rule: 'Gerou o link de pagamento da Olimpo Pay nos últimos 3 dias e ainda não pagou' },
  { id: 'past_due', label: 'Pagamento em atraso', phase: 'Recuperação', transactional: true, cooldownDays: 3,
    goal: 'Regularizar antes de o acesso ser cortado', rule: 'Renovação não confirmada, ainda dentro da carência' },
  { id: 'payment_confirmed', label: 'Pagamento confirmado', phase: 'Retenção', transactional: true, cooldownDays: 365,
    goal: 'Dar boas-vindas ao assinante e criar o hábito', rule: 'Primeiro pagamento confirmado nas últimas 48 horas' },
  { id: 'renewal_soon', label: 'Renovação chegando', phase: 'Retenção', transactional: true, cooldownDays: 20,
    goal: 'Avisar com transparência e evitar estorno/chargeback', rule: 'Mensal renova em até 3 dias; anual em até 7 dias' },
  { id: 'canceled', label: 'Cancelou', phase: 'Retenção', transactional: true, cooldownDays: 30,
    goal: 'Entender o motivo e tentar reverter', rule: 'Cancelou a assinatura, mas ainda está no período pago' },
  { id: 'trial_ending', label: 'Teste acabando', phase: 'Conversão', transactional: false, cooldownDays: 5,
    goal: 'Converter no momento de maior intenção', rule: 'Teste grátis termina nas próximas 36 horas' },
  { id: 'activation', label: 'Não ativou', phase: 'Ativação', transactional: false, cooldownDays: 5,
    goal: 'Fazer o primeiro registro acontecer', rule: 'Criou a conta há mais de 20 horas e não fez nenhum registro' },
  { id: 'welcome', label: 'Boas-vindas', phase: 'Ativação', transactional: false, cooldownDays: 365,
    goal: 'Abrir o canal e mostrar o primeiro passo', rule: 'Cadastrou-se nas últimas 24 horas' },
  { id: 'trial_expired', label: 'Teste expirou', phase: 'Recuperação', transactional: false, cooldownDays: 4,
    goal: 'Trazer de volta quem quase comprou', rule: 'Teste terminou há até 10 dias e nunca pagou' },
  { id: 'inactive_paying', label: 'Assinante sumido', phase: 'Retenção', transactional: false, cooldownDays: 14,
    goal: 'Reengajar antes que vire cancelamento', rule: 'Pagante sem usar o app há mais de 10 dias' },
  { id: 'winback', label: 'Reconquista', phase: 'Recuperação', transactional: false, cooldownDays: 30,
    goal: 'Reativar ex-clientes e testes antigos', rule: 'Ex-assinante expirado, ou teste expirado entre 10 e 60 dias' },
  { id: 'referral', label: 'Pedir indicação', phase: 'Expansão', transactional: false, cooldownDays: 60,
    goal: 'Transformar fãs em canal de aquisição', rule: 'Pagante há mais de 20 dias com 30+ registros' },
];
export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, Stage>;

export const PHASE_STYLE: Record<Phase, { chip: string; dot: string }> = {
  'Ativação': { chip: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  'Conversão': { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  'Recuperação': { chip: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500' },
  'Retenção': { chip: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
  'Expansão': { chip: 'bg-teal-50 text-teal-700 ring-teal-600/20', dot: 'bg-teal-500' },
};

export interface Template { id: string; stage: StageId; name: string; body: string; active: boolean }

export interface MessagingConfig {
  senderNumber: string;
  senderName: string;
  dedupDays: number;
  requireOptIn: boolean;
  templates: Template[];
}

export interface MessageLogEntry {
  id: string; uid: string; email: string | null; name: string | null; stage: StageId | string; templateId: string;
  channel: string; preview?: string; by: string; at: number | null;
}

// ─── modelos padrão ─────────────────────────────────────────────────────────
// Princípios: nome da pessoa, dado real da conta dela, um único próximo passo, pergunta no fim
// para abrir conversa (no WhatsApp quem responde é cliente quente). Nada de urgência falsa.
export const DEFAULT_TEMPLATES: Template[] = [
  { id: 'checkout_abandoned', stage: 'checkout_abandoned', name: 'Pagamento não concluído', active: true, body:
`Oi, {primeiro_nome}! Aqui é {atendente}, do Lyvo.

Vi que você começou a assinar o *{plano}* mas o pagamento não foi concluído. Aconteceu algo no Pix ou no cartão?

Seu link continua valendo:
{link_pagamento}

Se travou em alguma etapa, me responde aqui que eu resolvo com você agora.` },

  { id: 'past_due', stage: 'past_due', name: 'Renovação não confirmada', active: true, body:
`{primeiro_nome}, tudo bem? A renovação do seu *{plano}* do Lyvo não foi confirmada. Normalmente é limite do cartão ou um Pix que ficou para depois.

Seu acesso continua liberado até *{fim_carencia}*. Depois disso o app pausa, mas seus dados ficam guardados.

Para regularizar é só entrar em {link_app}. Prefere que eu te mande um Pix aqui mesmo?` },

  { id: 'payment_confirmed', stage: 'payment_confirmed', name: 'Boas-vindas ao assinante', active: true, body:
`{primeiro_nome}, pagamento confirmado ✅ Bem-vindo(a) ao Lyvo *{plano}*!

Três hábitos que fazem diferença já no primeiro mês:
1. Registre na hora: uma mensagem curta no chat, tipo *mercado 87*
2. Cadastre suas contas fixas: o Lyvo te avisa antes de vencer
3. Toda segunda, olhe a *Previsibilidade* do mês

Este número é o seu canal direto com a gente. Qualquer dúvida, é só chamar.` },

  { id: 'renewal_soon', stage: 'renewal_soon', name: 'Aviso de renovação', active: true, body:
`Oi, {primeiro_nome}! Só para te avisar com antecedência: seu *{plano}* do Lyvo renova em *{vencimento}*, no valor de {preco_plano}.

Não precisa fazer nada. Se quiser trocar de plano ou tiver qualquer dúvida, me responde aqui.` },

  { id: 'canceled', stage: 'canceled', name: 'Entender o cancelamento', active: true, body:
`{primeiro_nome}, vi que você cancelou o Lyvo. Respeito totalmente, e seu acesso continua até *{vencimento}*.

Posso te fazer uma pergunta rápida? O que pesou mais: preço, falta de tempo para usar ou alguma função que faltou?

Se for algo que eu consiga resolver, eu resolvo. E sua resposta me ajuda muito a melhorar o app.` },

  { id: 'trial_ending', stage: 'trial_ending', name: 'Teste termina em breve', active: true, body:
`{primeiro_nome}, seu teste do Lyvo termina *{fim_trial}*. Até aqui você já organizou {seus_registros}, e é isso que mantém o mês sob controle.

Para continuar sem perder nada:
• *Anual*: {preco_anual} (sai {preco_anual_mes}/mês)
• *Mensal*: {preco_mensal}/mês, sem fidelidade

É só entrar em {link_app} e escolher. Quer que eu te mande o link direto de um dos dois?` },

  { id: 'activation', stage: 'activation', name: 'Primeiro registro', active: true, body:
`Oi, {primeiro_nome}! Aqui é {atendente}, do Lyvo.

Notei que você ainda não fez seu primeiro registro. Muita gente trava no começo achando que vai dar trabalho, e não dá: você escreve do jeito que fala.

Testa agora com algo de hoje:
👉 *uber 18*
👉 *recebi 2500 de salário*

Seu teste vai até *{fim_trial}*. Quer que eu te mostre em 1 minuto como deixar tudo pronto?` },

  { id: 'welcome', stage: 'welcome', name: 'Boas-vindas ao teste', active: true, body:
`Oi, {primeiro_nome}! Aqui é {atendente}, do Lyvo 👋

Que bom ter você aqui. Para sentir o Lyvo funcionando hoje, faz só isso: abre o chat e manda
*gastei 32 no almoço*

Ele registra, separa por categoria e já atualiza o seu mês. Leva 5 segundos.

Salva este número: qualquer dúvida, é só me chamar.` },

  { id: 'trial_expired', stage: 'trial_expired', name: 'Teste expirou', active: true, body:
`{primeiro_nome}, seu teste do Lyvo terminou, mas {seus_registros_cap} continua guardado do jeito que você deixou.

Assinando agora, você continua exatamente de onde parou:
• *Anual*: {preco_anual} (equivale a {preco_anual_mes}/mês)
• *Mensal*: {preco_mensal}/mês

{link_app}

Ficou alguma dúvida que te impediu de seguir? Me conta aqui.` },

  { id: 'inactive_paying', stage: 'inactive_paying', name: 'Reengajar assinante', active: true, body:
`{primeiro_nome}, faz {dias_sem_uso} dias que você não registra nada no Lyvo. Correria, né?

Uma dica de quem anda sem tempo: mande um áudio no fim do dia, tipo *hoje gastei 40 de mercado e 15 de café*. O Lyvo separa tudo sozinho.

Quer que eu te ajude a reorganizar o mês em 5 minutos?` },

  { id: 'winback', stage: 'winback', name: 'Reconquista', active: true, body:
`Oi, {primeiro_nome}! Aqui é {atendente}, do Lyvo.

{seus_registros_cap} continua salvo. Se quiser voltar a ter o mês na palma da mão, é só entrar em {link_app} e escolher um plano: a partir de {preco_anual_mes}/mês no anual.

E se algo não funcionou para você da última vez, me conta. Eu leio tudo pessoalmente.` },

  { id: 'referral', stage: 'referral', name: 'Pedido de indicação', active: true, body:
`{primeiro_nome}, você é uma das pessoas que mais usa o Lyvo: *{lancamentos} registros*! Obrigado de verdade.

Conhece alguém que vive dizendo que o dinheiro some no fim do mês? Manda o seu link pessoal:
{link_indicacao}

Isso ajuda muito um app pequeno como o nosso a crescer.` },
];

export const DEFAULT_MESSAGING: MessagingConfig = {
  senderNumber: '',
  senderName: 'Thiago',
  dedupDays: 5,
  requireOptIn: false,
  templates: DEFAULT_TEMPLATES,
};

/** Junta a config salva com os padrões (etapas novas ganham o modelo padrão). */
export function mergeMessaging(saved: Partial<MessagingConfig> | null | undefined): MessagingConfig {
  const base = { ...DEFAULT_MESSAGING, ...(saved || {}) } as MessagingConfig;
  const list = Array.isArray(saved?.templates) && saved!.templates!.length ? saved!.templates! : DEFAULT_TEMPLATES;
  const missing = DEFAULT_TEMPLATES.filter((d) => !list.some((t) => t.stage === d.stage));
  return { ...base, templates: [...list, ...missing] };
}

// ─── variáveis ──────────────────────────────────────────────────────────────
export const VARIABLES: { key: string; label: string }[] = [
  { key: 'primeiro_nome', label: 'Primeiro nome' },
  { key: 'nome', label: 'Nome completo' },
  { key: 'atendente', label: 'Seu nome (quem envia)' },
  { key: 'plano', label: 'Plano do cliente' },
  { key: 'preco_plano', label: 'Preço do plano do cliente' },
  { key: 'preco_mensal', label: 'Preço do mensal' },
  { key: 'preco_anual', label: 'Preço do anual' },
  { key: 'preco_anual_mes', label: 'Anual dividido por 12' },
  { key: 'fim_trial', label: 'Fim do teste (relativo)' },
  { key: 'vencimento', label: 'Data de vencimento/renovação' },
  { key: 'fim_carencia', label: 'Fim da carência' },
  { key: 'lancamentos', label: 'Nº de registros' },
  { key: 'seus_registros', label: '“seus 23 registros”' },
  { key: 'seus_registros_cap', label: '“Seus 23 registros” (início de frase)' },
  { key: 'dias_sem_uso', label: 'Dias sem usar' },
  { key: 'link_app', label: 'Link do app' },
  { key: 'link_pagamento', label: 'Link de pagamento pendente' },
  { key: 'link_indicacao', label: 'Link de indicação' },
];

const APP_URL = 'https://meulyvo.com';
const DAY = 864e5;
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (t: number | null | undefined) => (t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');
function relDay(t: number | null | undefined, now: number): string {
  if (!t) return '';
  const startOf = (x: number) => { const d = new Date(x); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const diff = Math.round((startOf(t) - startOf(now)) / DAY);
  const hh = new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `hoje às ${hh}`;
  if (diff === 1) return `amanhã às ${hh}`;
  if (diff === -1) return 'ontem';
  return diff > 1 ? `em ${dateBR(t)}` : `em ${dateBR(t)}`;
}

export interface Ctx {
  now: number;
  cfg: BillingConfig | null;
  messaging: MessagingConfig;
  /** assinatura Olimpo aguardando pagamento deste usuário, se houver */
  waitingSub?: Subscription | null;
  /** primeiro pagamento confirmado (ms) */
  firstPaidAt?: number | null;
}

export function buildVars(u: UserRow, ctx: Ctx): Record<string, string> {
  const plans = ctx.cfg?.plans || [];
  const monthly = plans.find((p) => p.interval === 'month');
  const annual = plans.find((p) => p.interval === 'year');
  const userPlan = plans.find((p) => p.id === (ctx.waitingSub?.planId || u.planId));
  const first = (u.name || '').trim().split(/\s+/)[0] || '';
  const regs = u.usage.transactions + u.usage.events;
  const seus = regs > 0 ? `seus ${regs} registro${regs === 1 ? '' : 's'}` : 'sua conta';
  return {
    primeiro_nome: first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : 'tudo bem',
    nome: u.name || '',
    atendente: ctx.messaging.senderName || 'a equipe',
    plano: userPlan?.name || (u.planId === 'annual' ? 'Plano Anual' : u.planId === 'monthly' ? 'Plano Mensal' : 'Lyvo'),
    preco_plano: userPlan ? brl(userPlan.price) : '',
    preco_mensal: monthly ? brl(monthly.price) : '',
    preco_anual: annual ? brl(annual.price) : '',
    preco_anual_mes: annual ? brl(Math.floor((annual.price / 12) * 100) / 100) : '',
    fim_trial: relDay(u.trialEndsAt, ctx.now),
    vencimento: dateBR(u.periodEnd),
    fim_carencia: dateBR(u.graceUntil || u.periodEnd),
    lancamentos: String(regs),
    seus_registros: seus,
    seus_registros_cap: seus[0].toUpperCase() + seus.slice(1),
    dias_sem_uso: u.lastActiveAt ? String(Math.max(1, Math.floor((ctx.now - u.lastActiveAt) / DAY))) : 'alguns',
    link_app: APP_URL,
    link_pagamento: ctx.waitingSub?.paymentLink || APP_URL,
    link_indicacao: `${APP_URL}/?ref=${u.uid}`,
  };
}

export function render(body: string, vars: Record<string, string>): string {
  return body.replace(/\{([a-z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m)).replace(/\n{3,}/g, '\n\n').trim();
}

/** Variáveis usadas no texto que ficaram vazias para este cliente (ex.: sem plano) */
export function missingVars(body: string, vars: Record<string, string>): string[] {
  const used = Array.from(new Set(Array.from(body.matchAll(/\{([a-z_]+)\}/g)).map((m) => m[1])));
  return used.filter((k) => !(k in vars) || !vars[k]);
}

export function phoneDigits(phone: string): string | null {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return null;
  return '55' + d;
}

export const waLink = (phone: string, text: string) => {
  const p = phoneDigits(phone);
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null;
};

// ─── quem entra em qual etapa ───────────────────────────────────────────────
export function matchStage(u: UserRow, ctx: Ctx): { stage: StageId; reason: string } | null {
  const now = ctx.now;
  const regs = u.usage.transactions + u.usage.events;
  const paying = u.hasAccess && ['active', 'past_due', 'canceled'].includes(u.status);
  const age = u.createdAt ? now - u.createdAt : 0;

  if (ctx.waitingSub && !paying) {
    const t = (ctx.waitingSub as any).createdAt ?? ctx.waitingSub.startedAt ?? null;
    const h = t ? Math.max(1, Math.round((now - t) / 3600e3)) : null;
    return { stage: 'checkout_abandoned', reason: `Gerou o pagamento${h ? ` há ${h < 48 ? h + ' h' : Math.round(h / 24) + ' dias'}` : ''} e não concluiu` };
  }
  if (u.status === 'past_due') return { stage: 'past_due', reason: `Renovação não confirmada · carência até ${dateBR(u.graceUntil)}` };
  if (paying && ctx.firstPaidAt && now - ctx.firstPaidAt < 2 * DAY) return { stage: 'payment_confirmed', reason: 'Primeiro pagamento confirmado agora' };
  if (u.status === 'active' && u.periodEnd && u.periodEnd > now) {
    const left = u.periodEnd - now;
    const annual = u.planId === 'annual';
    if (left < (annual ? 7 : 3) * DAY) return { stage: 'renewal_soon', reason: `Renova em ${dateBR(u.periodEnd)}` };
  }
  if (u.status === 'canceled') return { stage: 'canceled', reason: `Cancelou · acesso até ${dateBR(u.periodEnd)}` };
  if (u.status === 'trial' && u.trialEndsAt && u.trialEndsAt - now < 36 * 3600e3) {
    return { stage: 'trial_ending', reason: `Teste termina ${relDay(u.trialEndsAt, now)} · ${regs} registros` };
  }
  if (u.status === 'trial' && regs === 0 && age > 20 * 3600e3) return { stage: 'activation', reason: `Cadastrou há ${Math.round(age / 3600e3)} h e não registrou nada` };
  if (u.status === 'trial' && age < DAY) return { stage: 'welcome', reason: 'Cadastro novo' };
  if (u.status === 'trial_expired' && !u.everPaid && u.trialEndsAt && now - u.trialEndsAt < 10 * DAY) {
    return { stage: 'trial_expired', reason: `Teste expirou ${dateBR(u.trialEndsAt)} · ${regs} registros` };
  }
  if (paying && u.lastActiveAt && now - u.lastActiveAt > 10 * DAY) {
    return { stage: 'inactive_paying', reason: `Pagante sem usar há ${Math.floor((now - u.lastActiveAt) / DAY)} dias` };
  }
  if ((['expired', 'refunded'].includes(u.status) && u.everPaid) ||
      (u.status === 'trial_expired' && u.trialEndsAt && now - u.trialEndsAt >= 10 * DAY && now - u.trialEndsAt < 60 * DAY)) {
    return { stage: 'winback', reason: u.everPaid ? 'Ex-assinante' : `Teste expirou há ${Math.floor((now - (u.trialEndsAt || now)) / DAY)} dias` };
  }
  if (u.status === 'active' && regs >= 30 && age > 20 * DAY) return { stage: 'referral', reason: `${regs} registros · cliente engajado` };
  return null;
}

export interface QueueItem {
  user: UserRow;
  stage: Stage;
  reason: string;
  template: Template | null;
  text: string;
  link: string | null;
  missing: string[];
  blockedBy: 'no_phone' | 'opt_out' | 'no_opt_in' | null;
  lastSameStageAt: number | null;
}

export function buildQueue(
  users: UserRow[], subs: Subscription[], events: BillingEvent[], log: MessageLogEntry[], ctx: Omit<Ctx, 'waitingSub' | 'firstPaidAt'>,
): { due: QueueItem[]; contacted: QueueItem[] } {
  const now = ctx.now;
  const waitingByUid = new Map<string, Subscription>();
  subs.filter((s) => s.provider === 'olimpopay' && s.status === 'waiting' && s.uid && s.paymentLink).forEach((s) => {
    const created = (s as any).createdAt ?? s.startedAt ?? now;
    if (now - created < 3 * DAY) waitingByUid.set(s.uid!, s);
  });
  const firstPaid = new Map<string, number>();
  events.filter((e) => e.uid && e.revenue > 0 && !e.isTest).forEach((e) => {
    const t = e.occurredAt || 0;
    if (!firstPaid.has(e.uid!) || t < firstPaid.get(e.uid!)!) firstPaid.set(e.uid!, t);
  });
  const lastBy = new Map<string, number>();
  log.forEach((l) => { const k = `${l.uid}:${l.stage}`; if ((l.at || 0) > (lastBy.get(k) || 0)) lastBy.set(k, l.at || 0); });

  const due: QueueItem[] = [];
  const contacted: QueueItem[] = [];
  for (const u of users) {
    if (u.blocked || u.isAdmin) continue;
    const c: Ctx = { ...ctx, waitingSub: waitingByUid.get(u.uid) || null, firstPaidAt: firstPaid.get(u.uid) || null };
    const m = matchStage(u, c);
    if (!m) continue;
    const stage = STAGE_BY_ID[m.stage];
    const tpl = ctx.messaging.templates.find((t) => t.stage === m.stage && t.active) || null;
    const vars = buildVars(u, c);
    const text = tpl ? render(tpl.body, vars) : '';
    const blockedBy: QueueItem['blockedBy'] = !phoneDigits(u.phone) ? 'no_phone'
      : u.whatsappOptOut ? 'opt_out'
      : (!stage.transactional && ctx.messaging.requireOptIn && !u.whatsappOptIn) ? 'no_opt_in' : null;
    const last = lastBy.get(`${u.uid}:${m.stage}`) || null;
    const item: QueueItem = {
      user: u, stage, reason: m.reason, template: tpl, text, link: tpl ? waLink(u.phone, text) : null,
      missing: tpl ? missingVars(tpl.body, vars) : [], blockedBy, lastSameStageAt: last,
    };
    const cooldown = (stage.cooldownDays ?? ctx.messaging.dedupDays) * DAY;
    if (last && now - last < cooldown) contacted.push(item); else due.push(item);
  }
  const order = new Map(STAGES.map((s, i) => [s.id, i]));
  const sort = (a: QueueItem, b: QueueItem) => (order.get(a.stage.id)! - order.get(b.stage.id)!) || ((b.user.createdAt || 0) - (a.user.createdAt || 0));
  return { due: due.sort(sort), contacted: contacted.sort(sort) };
}

/** Conversão: quem recebeu mensagem da etapa e pagou nos 7 dias seguintes. */
export function stageConversion(log: MessageLogEntry[], events: BillingEvent[]) {
  const pays = events.filter((e) => e.uid && e.revenue > 0 && !e.isTest);
  const out: Record<string, { sent: number; converted: number }> = {};
  for (const l of log) {
    const k = String(l.stage);
    out[k] = out[k] || { sent: 0, converted: 0 };
    out[k].sent++;
    if (pays.some((p) => p.uid === l.uid && (p.occurredAt || 0) > (l.at || 0) && (p.occurredAt || 0) - (l.at || 0) < 7 * DAY)) out[k].converted++;
  }
  return out;
}
