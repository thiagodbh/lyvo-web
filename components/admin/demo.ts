// Dados FICTÍCIOS para avaliar o painel sem tocar em produção.
// Só é carregado com ?demo=1 em dev ou em build com VITE_ADMIN_DEMO=1.

import type {
  AdminApi, AuditEntry, BillingConfig, BillingEvent, GatewayInfo, Overview, ProviderId,
  Subscription, UserDetail, UserRow, UserStatus,
} from './types';

const DAY = 864e5;
const NOW = Date.now();

// RNG determinístico (mesmos dados a cada carregamento)
let seed = 42;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;

const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sabrina', 'Tiago', 'Vanessa', 'William', 'Juliana', 'Lucas', 'Mariana', 'Pedro', 'Renata', 'Caio', 'Letícia', 'Gustavo', 'Camila', 'André'];
const LAST = ['Souza', 'Oliveira', 'Santos', 'Lima', 'Pereira', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Ribeiro', 'Carvalho', 'Teixeira'];
const CITIES: [string, string][] = [['Belo Horizonte', 'MG'], ['São Paulo', 'SP'], ['Florianópolis', 'SC'], ['Curitiba', 'PR'], ['Rio de Janeiro', 'RJ'], ['Contagem', 'MG'], ['Porto Alegre', 'RS'], ['Goiânia', 'GO'], ['Salvador', 'BA'], ['Recife', 'PE']];
const INCOMES = ['Até 3k', '3k-7k', '7k-15k', '15k-30k', 'Acima 30k'];
const PROFS = ['Autônomo', 'Analista', 'Professora', 'Personal trainer', 'Dentista', 'Vendedor', 'Engenheiro', 'Designer', 'Fisioterapeuta', 'Empresário'];
const SOURCES: [string | null, string | null][] = [['instagram', 'organico'], ['meta', 'lyvo_conversao_out'], ['meta', 'lyvo_remarketing'], ['google', 'lyvo_search_marca'], [null, null], [null, null], ['tiktok', 'ugc_teste']];

const CONFIG: BillingConfig = {
  plans: [
    { id: 'annual', name: 'Plano Anual', price: 149.9, interval: 'year', installmentsText: 'ou até 5x no cartão', highlight: true, active: true,
      features: ['Acesso completo por 12 meses', 'Economia frente ao mensal'],
      checkout: { lastlink: 'https://lastlink.com/p/CA05DE2CE/checkout-payment/' },
      externalIds: { lastlink: ['d5d81bb8-anual-exemplo'] } },
    { id: 'monthly', name: 'Plano Mensal', price: 24.9, interval: 'month', active: true,
      features: ['Cancele quando quiser', 'Sem fidelidade'],
      checkout: { lastlink: 'https://lastlink.com/p/CE5BD085C/checkout-payment/' },
      externalIds: { lastlink: ['d5d81bb8-mensal-exemplo'] } },
  ],
  providerOrder: ['olimpopay', 'lastlink', 'kiwify', 'hotmart', 'cakto'],
  providers: {
    olimpopay: { enabled: true, validated: false, label: 'Olimpo Pay', mode: 'api' },
    lastlink: { enabled: true, validated: true, label: 'LastLink', mode: 'link' },
    kiwify: { enabled: false, validated: false, label: 'Kiwify' },
    hotmart: { enabled: false, validated: false, label: 'Hotmart' },
    cakto: { enabled: false, validated: false, label: 'Cakto' },
  },
  trialDays: 3,
  graceDays: 3,
  allowLegacyLastlink: true,
};

const RT: Record<string, Record<string, string>> = {
  olimpopay: { approved: 'subscription:ACTIVE:paid', renewed: 'subscription:ACTIVE:paid', refund: 'transaction:refunded', cancel: 'subscription:CANCELLED', late: 'subscription:ACTIVE:overdue' },
  lastlink: { approved: 'Purchase_Order_Confirmed', renewed: 'Recurrent_Payment', refund: 'Payment_Refund', cancel: 'Subscription_Canceled', late: 'Subscription_Renewal_Pending' },
};
const users: UserRow[] = [];
const events: BillingEvent[] = [];
const subs: Subscription[] = [];
const audit: AuditEntry[] = [];
const notes = new Map<string, { text: string; by: string; at: number }[]>();
let messagingCfg: any = null;
const msgLog: any[] = [];
let evId = 1;

const addEvent = (e: Partial<BillingEvent>) => {
  events.push({
    id: `demo_${evId++}`, provider: 'lastlink', rawType: 'Purchase_Order_Confirmed', type: 'PAYMENT_APPROVED',
    email: null, uid: null, matched: true, planId: null, amount: null, revenue: 0, occurredAt: NOW,
    receivedAt: NOW, isTest: false, endpoint: 'v2', result: 'applied', paymentMethod: 'credit_card', hasRaw: true,
    ...e,
  } as BillingEvent);
};

function build() {
  for (let i = 0; i < 238; i++) {
    // crescimento: mais cadastros recentes
    const age = Math.floor(Math.pow(rnd(), 1.6) * 180);
    const createdAt = NOW - age * DAY - Math.floor(rnd() * DAY);
    const first = pick(FIRST); const last = pick(LAST);
    const uid = `demo_u${i.toString().padStart(3, '0')}`;
    const email = `${first}.${last}${i}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '@exemplo.com';
    const [src, camp] = pick(SOURCES);
    const legacy = createdAt < NOW - 6 * DAY && chance(0.35); // contas antigas sem perfil (bug antigo)
    const [city, uf] = pick(CITIES);
    const trialEndsAt = createdAt + 3 * DAY;
    const activated = chance(0.62);
    const tx = activated ? Math.floor(Math.pow(rnd(), 4) * 200) + 1 : 0;
    const ev = activated ? Math.floor(Math.pow(rnd(), 3) * 20) : 0;

    let status: UserStatus = trialEndsAt > NOW ? 'trial' : 'trial_expired';
    let planId: string | null = null;
    let provider: ProviderId | 'manual' | null = null;
    let periodEnd: number | null = null;
    let graceUntil: number | null = null;
    let totalPaid = 0;
    let everPaid = false;

    const converts = trialEndsAt < NOW && activated && tx + ev > 6 && chance(0.5);
    if (converts) {
      everPaid = true;
      planId = chance(0.4) ? 'annual' : 'monthly';
      const plan = CONFIG.plans.find((p) => p.id === planId)!;
      provider = createdAt > NOW - 50 * DAY && chance(0.85) ? 'olimpopay' : 'lastlink';
      const start = Math.min(trialEndsAt + Math.floor(rnd() * 2 * DAY), NOW - 3600e3);
      const subId = `sub_${uid}`;
      const fate = rnd();
      let paidCount = 1;
      addEvent({ provider, email, uid, planId, amount: plan.price, revenue: plan.price, occurredAt: start, receivedAt: start + 4000,
        rawType: RT[provider].approved, externalSubscriptionId: subId, paymentMethod: pick(['credit_card', 'pix', 'pix', 'credit_card']) });
      if (planId === 'monthly') {
        let t = start + 31 * DAY;
        while (t < NOW && fate > 0.18) {
          addEvent({ provider, email, uid, planId, amount: plan.price, revenue: plan.price, occurredAt: t, receivedAt: t + 3000, type: 'PAYMENT_RENEWED',
            rawType: RT[provider].renewed, externalSubscriptionId: subId });
          paidCount++; t += 31 * DAY;
        }
        periodEnd = start + paidCount * 31 * DAY;
      } else {
        periodEnd = start + 366 * DAY;
      }
      totalPaid = paidCount * plan.price;
      status = 'active';
      if (fate < 0.07) {
        const refundAt = Math.min(start + 5 * DAY, NOW - 3600e3);
        status = 'refunded'; periodEnd = refundAt; totalPaid = 0;
        addEvent({ provider, email, uid, planId, amount: plan.price, revenue: -plan.price, occurredAt: refundAt, receivedAt: refundAt, type: 'REFUNDED', rawType: RT[provider].refund });
      } else if (fate < 0.18 && planId === 'monthly') {
        status = periodEnd > NOW ? 'canceled' : 'expired';
        const cAt = Math.min(periodEnd - 10 * DAY, NOW - DAY);
        addEvent({ provider, email, uid, planId, occurredAt: cAt, receivedAt: cAt, type: 'SUBSCRIPTION_CANCELED', rawType: RT[provider].cancel, amount: null });
      } else if (periodEnd < NOW && planId === 'monthly' && chance(0.6)) {
        status = 'past_due'; graceUntil = Math.max(periodEnd, NOW) + 3 * DAY;
        addEvent({ provider, email, uid, planId, occurredAt: NOW - Math.floor(rnd() * 2 * DAY), type: 'RENEWAL_LATE', rawType: RT[provider].late, amount: null });
      } else if (periodEnd < NOW) {
        status = 'expired';
      }
      subs.push({ id: `${provider}_${subId}`, provider: provider as ProviderId, email, uid, planId,
        status: status as any, startedAt: start,
        lastPaymentAt: start + (paidCount - 1) * 31 * DAY, lastAmount: plan.price, paymentsCount: paidCount,
        currentPeriodEnd: periodEnd, canceledAt: status === 'canceled' ? Math.min(periodEnd! - 10 * DAY, NOW - DAY) : null, externalSubscriptionId: subId });
    } else if (trialEndsAt < NOW && chance(0.025)) {
      status = 'courtesy'; planId = 'annual'; provider = 'manual'; periodEnd = NOW + 200 * DAY;
    } else if (chance(0.008)) {
      status = 'blocked';
    }

    const lastActiveAt = status === 'active' || status === 'past_due' || status === 'courtesy'
      ? NOW - Math.floor((chance(0.3) ? 7 + rnd() * 35 : rnd() * 6) * DAY)
      : activated ? Math.min(NOW, createdAt + Math.floor(rnd() * 6 * DAY)) : createdAt + 60000;

    users.push({
      uid, email,
      name: legacy ? '' : `${first} ${last}`,
      phone: legacy ? '' : `(${pick(['31', '11', '48', '41', '21'])}) 9${Math.floor(1000 + rnd() * 8999)}-${Math.floor(1000 + rnd() * 8999)}`,
      city: legacy ? '' : city, state: legacy ? '' : uf,
      income: legacy ? '' : pick(INCOMES), profession: legacy ? '' : pick(PROFS),
      createdAt, lastSignInAt: lastActiveAt - 3600e3, lastActiveAt, lastOpenAt: lastActiveAt, lastOpenVia: chance(0.4) ? 'pwa' : 'browser',
      emailVerified: chance(0.3), authProviders: ['password'],
      status, hasAccess: ['trial', 'active', 'past_due', 'canceled', 'courtesy'].includes(status),
      planId, provider, periodEnd, graceUntil, trialEndsAt, everPaid, totalPaid,
      usage: { transactions: tx, events: ev, firstTxAt: tx ? createdAt + 20 * 60000 : null, lastTxAt: tx ? lastActiveAt : null, googleConnected: activated && chance(0.25) },
      acquisition: src ? { utm_source: src, utm_campaign: camp || '', landing: '/' } : (chance(0.15) ? { ref: 'demo_u007' } : null),
      referredBy: null,
      profileCompleteness: legacy ? 0 : 100,
      blocked: status === 'blocked', isAdmin: i === 0, hasDoc: !(legacy && chance(0.1)), hasAuth: true,
      notesCount: 0, pushEnabled: chance(0.3),
      whatsappOptIn: createdAt > NOW - 5 * DAY ? chance(0.7) : false, whatsappOptOut: chance(0.015), lastContactAt: null,
    });
  }
  users[0] = { ...users[0], name: 'Thiago (você)', email: 'admin@exemplo.com', isAdmin: true, status: 'courtesy', hasAccess: true, planId: 'annual', provider: 'manual', periodEnd: NOW + 300 * DAY };

  // pagamento sem conta (e-mail diferente do cadastro)
  addEvent({ email: 'maria.compra@exemplo.com', uid: null, matched: false, planId: 'annual', amount: 149.9, revenue: 149.9, occurredAt: NOW - 2 * DAY, receivedAt: NOW - 2 * DAY, result: 'pending_user', name: 'Maria Compra' });
  addEvent({ rawType: 'Purchase_Order_Confirmed', email: 'joao.outroemail@exemplo.com', uid: null, matched: false, planId: 'monthly', amount: 24.9, revenue: 24.9, occurredAt: NOW - 9 * 3600e3, receivedAt: NOW - 9 * 3600e3, result: 'pending_user' });
  // produto sem mapeamento
  const u = users.find((x) => x.status === 'active' && x.provider === 'lastlink') || users[5];
  addEvent({ rawType: 'Purchase_Order_Confirmed', email: u.email, uid: u.uid, planId: null, amount: 19.9, revenue: 19.9, occurredAt: NOW - 30 * 3600e3, receivedAt: NOW - 30 * 3600e3, result: 'unmatched_plan' });
  // webhook legado ainda chegando
  addEvent({ endpoint: 'legacy', rawType: 'legacy:approved', email: users[3].email, uid: users[3].uid, occurredAt: NOW - 4 * DAY, receivedAt: NOW - 4 * DAY, result: 'no_change', amount: null });
  // ruído: pendentes / ignorados / teste
  for (let k = 0; k < 14; k++) {
    const x = pick(users);
    const t = NOW - Math.floor(rnd() * 25 * DAY);
    addEvent({ email: x.email, uid: x.uid, type: pick(['PAYMENT_PENDING', 'PAYMENT_FAILED', 'IGNORED']), rawType: pick(['Purchase_Request_Confirmed', 'Purchase_Request_Expired', 'Abandoned_Cart']), occurredAt: t, receivedAt: t, result: 'no_change', amount: 24.9 });
  }
  addEvent({ isTest: true, email: 'teste@lastlink.com', uid: null, matched: false, result: 'test', occurredAt: NOW - 12 * DAY, receivedAt: NOW - 12 * DAY, amount: 97 });
  users.filter((x) => x.status === 'trial_expired' && x.createdAt && x.createdAt > NOW - 10 * DAY).slice(0, 4).forEach((x, i) => {
    subs.push({ id: `olimpopay_9${i}`, provider: 'olimpopay', email: x.email, uid: x.uid, planId: i % 2 ? 'annual' : 'monthly', status: 'waiting',
      startedAt: null, lastPaymentAt: null, paymentsCount: 0, currentPeriodEnd: null, canceledAt: null, externalSubscriptionId: `9${i}`,
      paymentLink: 'https://go.olimpopay.com.br/link/exemplo', remoteStatus: 'WAITING', createdAt: NOW - (i * 9 + 3) * 3600e3 });
  });
  subs.forEach((sb) => { if (sb.provider === 'olimpopay' && sb.status === 'active') sb.nextChargeAt = sb.currentPeriodEnd; });
  events.sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));

  // histórico de mensagens fictício (últimos 20 dias)
  const STG = ['trial_ending', 'activation', 'trial_expired', 'checkout_abandoned', 'past_due', 'welcome', 'renewal_soon', 'winback'];
  for (let k = 0; k < 46; k++) {
    const x = users[1 + Math.floor(rnd() * (users.length - 1))];
    const at = NOW - Math.floor(rnd() * 20 * DAY) - 2 * DAY;
    const stage = pick(STG);
    msgLog.push({ id: `m${k}`, uid: x.uid, email: x.email, name: x.name, stage, templateId: stage, channel: 'whatsapp_manual',
      preview: `Oi, ${x.name.split(' ')[0] || 'tudo bem'}! Aqui é Thiago, do Lyvo.`, by: 'admin@exemplo.com', at });
    x.lastContactAt = Math.max(x.lastContactAt || 0, at);
  }
  msgLog.sort((a, b) => b.at - a.at);
  // alguns cadastros de hoje e pagamentos recém-confirmados para a fila ter todas as etapas
  users.slice(1).filter((x) => x.status === 'trial').slice(0, 3).forEach((x, i) => { x.createdAt = NOW - (i * 5 + 2) * 3600e3; x.trialEndsAt = x.createdAt + 3 * DAY; });

  const actor = 'admin@exemplo.com';
  const sample = users.filter((x) => x.status === 'courtesy').slice(0, 2);
  sample.forEach((x, i) => audit.push({ id: `a${i}`, actorEmail: actor, action: 'grant_access', targetUid: x.uid, targetEmail: x.email, reason: 'Parceria / influenciador', params: { planId: 'annual', kind: 'courtesy' }, at: NOW - (i + 3) * DAY }));
  audit.push({ id: 'a9', actorEmail: actor, action: 'extend_trial', targetUid: users[12].uid, targetEmail: users[12].email, reason: 'Pediu mais tempo pelo WhatsApp', params: { days: 7 }, at: NOW - DAY });
  audit.push({ id: 'a10', actorEmail: actor, action: 'save_billing_config', targetUid: null, targetEmail: null, reason: 'Kiwify adicionada como fallback', at: NOW - 6 * DAY });
}
build();

// ─── cálculo da visão geral (mesma lógica do servidor) ──────────────────────
const within = (t: number | null, d: number) => !!t && NOW - t <= d * DAY;
const months: Record<string, number> = { month: 1, quarter: 3, semester: 6, year: 12, lifetime: 0 };

function computeOverview(): Overview {
  const paying = users.filter((u) => u.hasAccess && ['active', 'past_due', 'canceled'].includes(u.status));
  const planById = new Map(CONFIG.plans.map((p) => [p.id, p]));
  const mrr = paying.reduce((s, u) => { const p = u.planId ? planById.get(u.planId) : null; return s + (p && months[p.interval] ? p.price / months[p.interval] : 0); }, 0);
  const real = events.filter((e) => !e.isTest);
  const mk = (t: number) => new Date(t - 3 * 3600e3).toISOString().slice(0, 7);
  const dk = (t: number) => new Date(t - 3 * 3600e3).toISOString().slice(0, 10);
  const revenueByMonth: Record<string, number> = {};
  const revenueByProvider: Record<string, number> = {};
  real.forEach((e) => { const t = e.occurredAt || NOW; revenueByMonth[mk(t)] = (revenueByMonth[mk(t)] || 0) + e.revenue; if (e.revenue) revenueByProvider[e.provider] = (revenueByProvider[e.provider] || 0) + e.revenue; });
  const signups: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) signups[dk(NOW - i * DAY)] = 0;
  users.forEach((u) => { if (u.createdAt && within(u.createdAt, 30)) signups[dk(u.createdAt)]++; });
  const trialEnded = users.filter((u) => u.trialEndsAt && u.trialEndsAt < NOW);
  const churned = new Set(real.filter((e) => ['SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_EXPIRED', 'REFUNDED', 'CHARGEBACK'].includes(e.type) && within(e.occurredAt, 30)).map((e) => e.uid || e.email));
  const act = (u: UserRow) => u.usage.transactions + u.usage.events > 0;
  const eng = (u: UserRow) => u.usage.transactions + u.usage.events >= 10;
  const by = (key: (u: UserRow) => string | null) => {
    const m: Record<string, { signups: number; paid: number }> = {};
    users.forEach((u) => { const k = key(u) || '(direto/desconhecido)'; m[k] = m[k] || { signups: 0, paid: 0 }; m[k].signups++; if (u.everPaid) m[k].paid++; });
    return Object.entries(m).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.signups - a.signups).slice(0, 10);
  };
  const alerts: Overview['alerts'] = [];
  const unmatched = events.filter((e) => !e.matched && !e.isTest && ['PAYMENT_APPROVED', 'PAYMENT_RENEWED'].includes(e.type));
  if (unmatched.length) alerts.push({ level: 'critical', title: `${unmatched.length} pagamento(s) sem conta vinculada`, detail: 'Alguém pagou com um e-mail que não tem cadastro. O acesso fica pendente até vincular.', link: 'payments?filter=unmatched' });
  if (events.some((e) => e.result === 'unmatched_plan')) alerts.push({ level: 'warning', title: `${events.filter((e) => e.result === 'unmatched_plan').length} pagamento(s) sem plano identificado`, detail: 'Cadastre o ID do produto/oferta do gateway no plano correspondente.', link: 'plans' });
  const pd = users.filter((u) => u.status === 'past_due').length;
  if (pd) alerts.push({ level: 'warning', title: `${pd} assinatura(s) em atraso`, detail: 'Ainda com acesso no período de carência.', link: 'subscriptions?filter=past_due' });
  if (events.some((e) => e.endpoint === 'legacy')) alerts.push({ level: 'critical', title: 'Webhook antigo da LastLink ainda em uso', detail: 'O endpoint antigo não tem token. Troque a URL no painel da LastLink pela nova (aba Gateways) e desligue o legado.', link: 'gateways' });
  (Object.keys(CONFIG.providers) as ProviderId[]).forEach((p) => { const c = CONFIG.providers[p]; if (c.enabled && !c.validated) alerts.push({ level: 'warning', title: `${c.label} habilitado sem validação`, detail: 'Envie um evento de teste e confira o mapeamento antes de usar em produção.', link: 'gateways' }); });
  const nodoc = users.filter((u) => !u.hasDoc).length;
  if (nodoc) alerts.push({ level: 'info', title: `${nodoc} conta(s) sem documento de perfil`, detail: 'Existem no login mas não no banco — normalmente cadastro interrompido.', link: 'users?filter=nodoc' });

  return {
    generatedAt: NOW,
    kpis: {
      totalUsers: users.length, newUsers7d: users.filter((u) => within(u.createdAt, 7)).length, newUsers30d: users.filter((u) => within(u.createdAt, 30)).length,
      payingUsers: paying.length, trialUsers: users.filter((u) => u.status === 'trial').length, courtesyUsers: users.filter((u) => u.status === 'courtesy').length,
      pastDue: pd, mrr, arr: mrr * 12, revenueThisMonth: revenueByMonth[mk(NOW)] || 0,
      revenue30d: real.filter((e) => within(e.occurredAt, 30)).reduce((s, e) => s + e.revenue, 0),
      refunds30d: -real.filter((e) => e.revenue < 0 && within(e.occurredAt, 30)).reduce((s, e) => s + e.revenue, 0),
      arpu: paying.length ? mrr / paying.length : 0,
      trialConversion: trialEnded.length ? trialEnded.filter((u) => u.everPaid).length / trialEnded.length : null,
      churn30d: paying.length + churned.size ? churned.size / (paying.length + churned.size) : null,
      inactive: (() => {
        const b = users.filter((u) => u.hasAccess && !u.blocked);
        const dd = (u: any) => (u.lastActiveAt ? (NOW - u.lastActiveAt) / DAY : 999);
        return { withAccess: b.length, d3: b.filter((u) => dd(u) >= 3 && dd(u) < 7).length, d7: b.filter((u) => dd(u) >= 7 && dd(u) < 14).length,
          d14: b.filter((u) => dd(u) >= 14 && dd(u) < 30).length, d30: b.filter((u) => dd(u) >= 30).length,
          paying: b.filter((u) => ['active', 'past_due', 'canceled'].includes(u.status) && dd(u) >= 7).length };
      })(),
      dau: users.filter((u) => within(u.lastActiveAt, 1)).length, wau: users.filter((u) => within(u.lastActiveAt, 7)).length, mau: users.filter((u) => within(u.lastActiveAt, 30)).length,
      profileComplete: users.filter((u) => u.profileCompleteness === 100).length / users.length,
    },
    funnel: [
      { step: 'Cadastros', value: users.length },
      { step: 'Ativados (1º lançamento)', value: users.filter(act).length },
      { step: 'Engajados (10+ registros)', value: users.filter(eng).length },
      { step: 'Pagaram', value: users.filter((u) => u.everPaid).length },
      { step: 'Pagantes hoje', value: paying.length },
    ],
    series: {
      signupsByDay: Object.entries(signups).map(([day, value]) => ({ day, value })),
      revenueByMonth: Object.entries(revenueByMonth).sort().slice(-12).map(([month, value]) => ({ month, value })),
    },
    revenueByProvider,
    planMix: CONFIG.plans.map((p) => ({ planId: p.id, name: p.name, users: paying.filter((u) => u.planId === p.id).length })),
    acquisition: { bySource: by((u) => u.acquisition?.utm_source || (u.acquisition?.ref ? 'indicação' : null)), byCampaign: by((u) => u.acquisition?.utm_campaign || null) },
    upcoming: {
      renewals7d: paying.filter((u) => u.periodEnd && u.periodEnd > NOW && u.periodEnd - NOW < 7 * DAY).map((u) => ({ uid: u.uid, email: u.email, name: u.name, planId: u.planId, at: u.periodEnd, status: u.status })).sort((a, b) => a.at! - b.at!),
      trialsEnding72h: users.filter((u) => u.status === 'trial' && u.trialEndsAt && u.trialEndsAt - NOW < 3 * DAY).map((u) => ({ uid: u.uid, email: u.email, name: u.name, at: u.trialEndsAt, activated: act(u) })).sort((a, b) => a.at! - b.at!),
    },
    alerts,
  };
}

const wait = <T,>(v: T, ms = 250): Promise<T> => new Promise((r) => setTimeout(() => r(JSON.parse(JSON.stringify(v))), ms));
const log = (action: string, u: UserRow | null, reason?: string, params?: any) =>
  audit.unshift({ id: `a${Date.now()}`, actorEmail: 'admin@exemplo.com', action, targetUid: u?.uid || null, targetEmail: u?.email || null, reason: reason || null, params, at: Date.now() });

export function createDemoApi(): AdminApi {
  return {
    mode: 'demo',
    whoami: () => wait({ email: 'admin@exemplo.com', uid: 'demo_u000' }, 50),
    overview: () => wait(computeOverview()),
    listUsers: () => wait(users),
    async getUser(uid) {
      const row = users.find((u) => u.uid === uid)!;
      const d: UserDetail = {
        row,
        profile: { birthDate: row.name ? '1992-05-14' : '', gender: '' },
        access: row.planId ? { status: row.status, planId: row.planId, provider: row.provider, currentPeriodEnd: row.periodEnd, graceUntil: row.graceUntil, source: row.provider === 'manual' ? 'manual' : 'payment', everPaid: row.everPaid } : null,
        notes: notes.get(uid) || [],
        events: events.filter((e) => e.uid === uid || e.email === row.email),
        subscriptions: subs.filter((s) => s.uid === uid),
        audit: audit.filter((a) => a.targetUid === uid),
        referrals: { invited: uid === 'demo_u007' ? users.filter((u) => u.acquisition?.ref === 'demo_u007').length : 0, invitedBy: row.acquisition?.ref || null },
        counts: { transactions: row.usage.transactions, fixedBills: Math.floor(row.usage.transactions / 12), creditCards: row.usage.transactions ? 2 : 0, forecasts: Math.floor(row.usage.transactions / 30), budgetLimits: 4, events: row.usage.events, calendarConnections: row.usage.googleConnected ? 1 : 0, calendarCategories: 0 },
        auth: { disabled: false, creationTime: row.createdAt!, lastSignInTime: row.lastSignInAt, providers: ['password'] },
      };
      return wait(d);
    },
    async userAction(uid, action, p) {
      const u = users.find((x) => x.uid === uid)!;
      const plan = CONFIG.plans.find((x) => x.id === p.planId);
      switch (action) {
        case 'grant_access':
          Object.assign(u, { status: p.kind === 'paid' ? 'active' : 'courtesy', hasAccess: true, planId: p.planId, provider: 'manual', blocked: false,
            periodEnd: p.until || Date.now() + (Number(p.days) || (plan?.interval === 'year' ? 366 : 31)) * DAY });
          break;
        case 'extend_trial':
          u.trialEndsAt = Math.max(Date.now(), u.trialEndsAt || 0) + Number(p.days) * DAY;
          if (!['active', 'courtesy'].includes(u.status)) Object.assign(u, { status: 'trial', hasAccess: true });
          break;
        case 'set_period_end': u.periodEnd = Number(p.until); break;
        case 'revoke_access': Object.assign(u, { status: 'expired', hasAccess: false, periodEnd: Date.now() }); break;
        case 'block': Object.assign(u, { status: 'blocked', hasAccess: false, blocked: true }); break;
        case 'unblock': Object.assign(u, { status: u.planId ? 'active' : 'trial_expired', hasAccess: !!u.planId, blocked: false }); break;
        case 'note': notes.set(uid, [{ text: p.text, by: 'admin@exemplo.com', at: Date.now() }, ...(notes.get(uid) || [])]); u.notesCount++; break;
        case 'update_profile': Object.assign(u, p.profile); break;
        case 'set_admin': u.isAdmin = !!p.value; break;
        case 'set_whatsapp_optout': u.whatsappOptOut = !!p.value; break;
        case 'password_reset_link': return wait({ ok: true, link: 'https://lyvo-web.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=EXEMPLO-DEMO' });
        case 'delete_account': users.splice(users.indexOf(u), 1); break;
      }
      log(action, u, p.reason, p);
      return wait({ ok: true });
    },
    listBilling: () => wait({ events, subscriptions: subs }),
    getEventRaw: (id) => {
      const e = events.find((x) => x.id === id)!;
      const raw = e.provider === 'olimpopay'
        ? { id: Number(String(e.externalSubscriptionId || '21').replace(/\D/g, '').slice(-4)) || 21, nome: `Lyvo — ${e.planId === 'annual' ? 'Plano Anual' : 'Plano Mensal'}`, valor: String(e.amount ?? 24.9), status: e.type === 'SUBSCRIPTION_CANCELED' ? 'CANCELLED' : 'ACTIVE', intervalo_valor: 1, intervalo_unidade: e.planId === 'annual' ? 'YEAR' : 'MONTH', data_inicio: '2026-10-01', ultimo_pagamento: new Date((e.occurredAt || NOW) - 3 * 3600e3).toISOString().slice(0, 19).replace('T', ' '), proxima_cobranca: new Date((e.occurredAt || NOW) + 31 * DAY).toISOString().slice(0, 10), payment_methods: ['PIX', 'CREDIT_CARD'], cliente_email: e.email }
        : e.provider === 'lastlink'
        ? { Id: e.id, IsTest: e.isTest, Event: e.rawType, CreatedAt: new Date(e.occurredAt || NOW).toISOString().slice(0, 19), Data: { Buyer: { Email: e.email, Name: e.name || 'Cliente Exemplo' }, Purchase: { PaymentId: `pay_${e.id}`, Recurrency: e.planId === 'annual' ? 12 : 1, Price: { Value: e.amount }, Payment: { PaymentMethod: e.paymentMethod } }, Plan: { Id: 'd5d81bb8-mensal-exemplo', Name: e.planId === 'annual' ? 'Anual' : 'Mensal' } } }
        : { order_id: `kw_${e.id}`, webhook_event_type: e.rawType, order_status: 'paid', Customer: { email: e.email, full_name: 'Cliente Exemplo' }, Product: { product_id: e.planId ? 'kw-anual-exemplo' : 'kw-produto-novo', product_name: 'Lyvo' }, Commissions: { charge_amount: Math.round((e.amount || 0) * 100) } };
      return wait({ rawJson: JSON.stringify(raw), accessBefore: null, accessAfter: null }, 100);
    },
    async linkEvent(eventId, uid, planId, reason) {
      const e = events.find((x) => x.id === eventId)!;
      const u = users.find((x) => x.uid === uid)!;
      Object.assign(e, { uid, matched: true, result: 'applied', planId: planId || e.planId });
      const plan = CONFIG.plans.find((p) => p.id === (planId || e.planId));
      Object.assign(u, { status: 'active', hasAccess: true, everPaid: true, planId: plan?.id || null, provider: e.provider, periodEnd: Date.now() + (plan?.interval === 'year' ? 366 : 31) * DAY, totalPaid: u.totalPaid + (e.amount || 0) });
      log('link_payment', u, reason, { eventId, planId });
      return wait({ ok: true, applied: true });
    },
    getConfig: () => wait(CONFIG),
    async saveConfig(cfg, reason) { Object.assign(CONFIG, JSON.parse(JSON.stringify(cfg))); log('save_billing_config', null, reason); return wait({ ok: true }); },
    gateways: () => wait((Object.keys(CONFIG.providers) as ProviderId[]).map<GatewayInfo>((p) => {
      const ev = events.filter((e) => e.provider === p && within(e.receivedAt, 30));
      return { id: p, ...CONFIG.providers[p],
        webhookUrl: CONFIG.providers[p].enabled ? `https://us-central1-lyvo-web.cloudfunctions.net/billingWebhook/${p}?token=demo${p}9f2c1e8a7b` : null,
        hasNativeSecret: false, mode: p === 'olimpopay' ? 'api' : 'link', events30d: ev.length, revenue30d: ev.reduce((s, e) => s + (e.isTest ? 0 : e.revenue), 0),
        lastEventAt: ev[0]?.receivedAt || null, errors30d: 0, supportsNative: !['lastlink', 'olimpopay'].includes(p) };
    })),
    async rotateToken(p) { log('rotate_webhook_token', null, undefined, { provider: p }); return wait({ webhookUrl: `https://us-central1-lyvo-web.cloudfunctions.net/billingWebhook/${p}?token=demo${Math.random().toString(16).slice(2, 14)}` }); },
    async setNativeSecret(p) { log('set_native_secret', null, undefined, { provider: p }); return wait({ ok: true }); },
    async dryRun(p, payload) {
      let body: any; try { body = JSON.parse(payload); } catch { throw new Error('JSON inválido'); }
      const email = (body?.Data?.Buyer?.Email || body?.Customer?.email || body?.data?.buyer?.email || body?.data?.customer?.email || '').toLowerCase() || null;
      const u = users.find((x) => x.email === email);
      return wait({
        normalized: { provider: p, rawType: body.Event || body.webhook_event_type || body.event, type: /refund/i.test(JSON.stringify(body)) ? 'REFUNDED' : 'PAYMENT_APPROVED', email, amount: body?.Data?.Purchase?.Price?.Value ?? null, externalProductIds: [] },
        plan: { id: 'monthly', name: 'Plano Mensal' }, matchedUid: u?.uid || null,
        accessAfter: { status: 'active', planId: 'monthly', currentPeriodEnd: Date.now() + 31 * DAY },
      });
    },
    listAudit: () => wait(audit),
    recomputeUsage: () => wait({ ok: true, users: users.length }, 900),
    olimpoPing: () => wait({ ok: true }, 600),
    getMessaging: () => wait(messagingCfg, 120),
    async saveMessaging(cfg, reason) { messagingCfg = JSON.parse(JSON.stringify(cfg)); log('save_messaging', null, reason); return wait({ ok: true }); },
    async logMessage(e) {
      const u = users.find((x) => x.uid === e.uid)!;
      const entry = { id: `m${Date.now()}`, uid: e.uid, email: u.email, name: u.name, stage: e.stage, templateId: e.templateId, channel: 'whatsapp_manual', preview: e.preview, by: 'admin@exemplo.com', at: Date.now() };
      msgLog.unshift(entry); u.lastContactAt = Date.now();
      return wait({ ok: true, id: entry.id }, 80);
    },
    listMessageLog: () => wait(msgLog),
    health: () => wait({ at: Date.now(), checks: [
      { id: 'backend', label: 'Servidor (Cloud Functions) publicado', status: 'ok', detail: 'Demonstração — dados fictícios.' },
      { id: 'olimpo_key', label: 'Chave da API Olimpo Pay', status: 'ok', detail: 'A API da Olimpo respondeu com a chave configurada.' },
      { id: 'olimpo_flow', label: 'Venda pela Olimpo Pay de ponta a ponta', status: 'warn', detail: 'Nenhum pagamento confirmado ainda. Faça uma compra de teste.', link: 'payments' },
      { id: 'legacy', label: 'Webhook antigo da LastLink desligado', status: 'fail', detail: 'Ainda aceita eventos sem token. Desligue depois de migrar a URL.', link: 'gateways' },
    ] }, 700),
    costs: () => wait((() => {
      const mk = (month: string, isCurrent: boolean, calls: number, users: number, revenue: number) => {
        const brl = calls * 0.0042;
        return { month, isCurrent, ai: { calls, images: Math.round(calls * 0.05), errors: 2, inTok: calls * 1600, outTok: calls * 110, usd: brl / 5.4, brl,
          projectedBrl: isCurrent ? brl * 1.25 : null, users, perCallBrl: 0.0042, perUserBrl: brl / users,
          top: [{ uid: 'u1', email: 'marina.alves@gmail.com', calls: 412, brl: 1.73 }, { uid: 'u2', email: 'rafael.cunha@outlook.com', calls: 288, brl: 1.21 }] },
          revenue, fees: revenue * 0.0399 + 3, byProvider: { olimpopay: { revenue, payments: 10, fee: revenue * 0.0399 + 3 } },
          fixed: 85, cloud: isCurrent ? null : 12.4, total: brl + revenue * 0.0399 + 3 + 85 + (isCurrent ? 0 : 12.4), margin: 0 };
      };
      const months = [mk('2026-11', true, 3120, 41, 498), mk('2026-10', false, 3890, 47, 622.5), mk('2026-09', false, 2210, 33, 373.5)];
      months.forEach((m) => { m.margin = m.revenue - m.total; });
      return { model: 'gemini-2.5-flash', price: { inText: 0.3, inAudio: 1, out: 2.5 }, months,
        config: { usdBrl: 5.4, fees: { olimpopay: { pct: 3.99, fixed: 0.3 }, lastlink: { pct: 9.9, fixed: 1 } },
          fixed: [{ id: 'f1', name: 'Vercel Pro', amountBrl: 110 }, { id: 'f2', name: 'Domínio meulyvo.com', amountBrl: 5 }], cloudBills: { '2026-10': 12.4 } } };
    })(), 600),
    saveCosts: () => wait({ ok: true as const }, 500),
    probeRules: () => wait({ id: 'rules', label: 'Regras de segurança do banco (Firestore)', status: 'ok' as const, detail: 'Demonstração.' }),
    olimpoSyncAll: () => wait({ synced: subs.filter((x) => x.provider === 'olimpopay' && ['waiting', 'active', 'past_due'].includes(x.status)).length, changed: 0, errors: 0 }, 900),
  };
}
