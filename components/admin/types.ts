// Tipos do painel admin (espelham o que functions/src/admin.ts devolve).

export type ProviderId = 'olimpopay' | 'lastlink' | 'kiwify' | 'hotmart' | 'cakto';
export type PlanInterval = 'month' | 'quarter' | 'semester' | 'year' | 'lifetime';
export type UserStatus =
  | 'trial' | 'trial_expired' | 'active' | 'past_due' | 'canceled'
  | 'expired' | 'refunded' | 'courtesy' | 'blocked';
export type CanonicalType =
  | 'PAYMENT_APPROVED' | 'PAYMENT_RENEWED' | 'PAYMENT_PENDING' | 'PAYMENT_FAILED'
  | 'RENEWAL_LATE' | 'SUBSCRIPTION_CANCELED' | 'SUBSCRIPTION_EXPIRED' | 'REFUNDED' | 'CHARGEBACK' | 'IGNORED';

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: PlanInterval;
  installmentsText?: string;
  highlight?: boolean;
  active: boolean;
  features?: string[];
  checkout: Partial<Record<ProviderId, string>>;
  externalIds: Partial<Record<ProviderId, string[]>>;
}

export interface BillingConfig {
  plans: Plan[];
  providerOrder: ProviderId[];
  providers: Record<ProviderId, { enabled: boolean; validated: boolean; label: string; mode?: 'api' | 'link' }>;
  trialDays: number;
  graceDays: number;
  allowLegacyLastlink: boolean;
}

export interface UserRow {
  uid: string;
  email: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  income: string;
  profession: string;
  createdAt: number | null;
  lastSignInAt: number | null;
  /** última vez que abriu o app (inclui o histórico do Firebase Auth) */
  lastOpenAt: number | null;
  lastOpenVia: 'pwa' | 'browser' | null;
  /** última atividade de qualquer tipo: abriu o app ou registrou algo */
  lastActiveAt: number | null;
  emailVerified: boolean;
  authProviders: string[];
  status: UserStatus;
  hasAccess: boolean;
  planId: string | null;
  provider: ProviderId | 'manual' | null;
  periodEnd: number | null;
  graceUntil: number | null;
  trialEndsAt: number | null;
  everPaid: boolean;
  totalPaid: number;
  usage: { transactions: number; events: number; firstTxAt: number | null; lastTxAt: number | null; googleConnected: boolean };
  acquisition: Record<string, string> | null;
  referredBy: string | null;
  profileCompleteness: number;
  blocked: boolean;
  isAdmin: boolean;
  hasDoc: boolean;
  hasAuth: boolean;
  notesCount: number;
  pushEnabled: boolean;
  whatsappOptIn?: boolean;
  whatsappOptOut?: boolean;
  lastContactAt?: number | null;
}

export interface BillingEvent {
  id: string;
  provider: ProviderId;
  rawType: string;
  type: CanonicalType;
  email: string | null;
  name?: string | null;
  uid: string | null;
  matched: boolean;
  planId: string | null;
  amount: number | null;
  revenue: number;
  occurredAt: number | null;
  receivedAt: number | null;
  isTest: boolean;
  endpoint: 'v2' | 'legacy';
  result: 'applied' | 'pending_user' | 'no_change' | 'duplicate' | 'test' | 'unmatched_plan' | 'error';
  paymentMethod?: string | null;
  externalPaymentId?: string | null;
  externalSubscriptionId?: string | null;
  hasRaw?: boolean;
}

export interface Subscription {
  id: string;
  provider: ProviderId;
  email: string | null;
  uid: string | null;
  planId: string | null;
  status: 'waiting' | 'active' | 'past_due' | 'canceled' | 'expired' | 'refunded' | 'abandoned';
  paymentLink?: string | null;
  createdAt?: number | null;
  nextChargeAt?: number | null;
  remoteStatus?: string | null;
  startedAt: number | null;
  lastPaymentAt: number | null;
  lastAmount?: number | null;
  paymentsCount?: number;
  currentPeriodEnd: number | null;
  canceledAt: number | null;
  externalSubscriptionId?: string | null;
}

export interface AuditEntry {
  id: string;
  actorEmail: string | null;
  action: string;
  targetUid: string | null;
  targetEmail: string | null;
  reason?: string | null;
  params?: Record<string, any>;
  before?: any;
  after?: any;
  at: number | null;
}

export interface Alert { level: 'critical' | 'warning' | 'info'; title: string; detail: string; link?: string }

export interface Overview {
  generatedAt: number;
  kpis: {
    totalUsers: number; newUsers7d: number; newUsers30d: number;
    payingUsers: number; trialUsers: number; courtesyUsers: number; pastDue: number;
    mrr: number; arr: number; revenueThisMonth: number; revenue30d: number; refunds30d: number; arpu: number;
    trialConversion: number | null; churn30d: number | null;
    dau: number; wau: number; mau: number; profileComplete: number;
    inactive?: { withAccess: number; d3: number; d7: number; d14: number; d30: number; paying: number };
  };
  funnel: { step: string; value: number }[];
  series: { signupsByDay: { day: string; value: number }[]; revenueByMonth: { month: string; value: number }[] };
  revenueByProvider: Record<string, number>;
  planMix: { planId: string; name: string; users: number }[];
  acquisition: { bySource: { key: string; signups: number; paid: number }[]; byCampaign: { key: string; signups: number; paid: number }[] };
  upcoming: {
    renewals7d: { uid: string; email: string; name: string; planId: string | null; at: number | null; status: string }[];
    trialsEnding72h: { uid: string; email: string; name: string; at: number | null; activated: boolean }[];
  };
  alerts: Alert[];
}

export interface UserDetail {
  row: UserRow;
  profile: { birthDate: string; gender: string };
  access: any;
  notes: { text: string; by: string; at: number | null }[];
  events: BillingEvent[];
  subscriptions: Subscription[];
  audit: AuditEntry[];
  referrals: { invited: number; invitedBy: string | null };
  counts: Record<string, number>;
  auth: { disabled: boolean; creationTime: number; lastSignInTime: number | null; providers: string[] } | null;
}

export interface GatewayInfo {
  id: ProviderId;
  mode?: 'api' | 'link';
  enabled: boolean;
  validated: boolean;
  label: string;
  webhookUrl: string | null;
  hasNativeSecret: boolean;
  events30d: number;
  revenue30d: number;
  lastEventAt: number | null;
  errors30d: number;
  supportsNative: boolean;
}

export type UserActionName =
  | 'grant_access' | 'extend_trial' | 'set_period_end' | 'revoke_access' | 'block' | 'unblock'
  | 'note' | 'update_profile' | 'password_reset_link' | 'revoke_sessions' | 'set_admin'
  | 'apply_pending' | 'delete_account' | 'cancel_gateway_subscription' | 'set_whatsapp_optout';

export interface AdminApi {
  mode: 'live' | 'demo';
  whoami(): Promise<{ email: string; uid: string }>;
  overview(): Promise<Overview>;
  listUsers(): Promise<UserRow[]>;
  getUser(uid: string): Promise<UserDetail>;
  userAction(uid: string, action: UserActionName, params: Record<string, any>): Promise<any>;
  listBilling(): Promise<{ events: BillingEvent[]; subscriptions: Subscription[] }>;
  getEventRaw(id: string): Promise<{ rawJson: string | null; accessBefore: any; accessAfter: any }>;
  linkEvent(eventId: string, uid: string, planId?: string, reason?: string): Promise<any>;
  getConfig(): Promise<BillingConfig>;
  saveConfig(config: BillingConfig, reason?: string): Promise<any>;
  gateways(): Promise<GatewayInfo[]>;
  rotateToken(provider: ProviderId): Promise<{ webhookUrl: string }>;
  setNativeSecret(provider: ProviderId, secret: string): Promise<any>;
  dryRun(provider: ProviderId, payload: string): Promise<any>;
  listAudit(): Promise<AuditEntry[]>;
  recomputeUsage(): Promise<any>;
  olimpoPing(): Promise<{ ok: boolean; error?: string; status?: number | null }>;
  olimpoSyncAll(): Promise<{ synced: number; changed: number; errors: number }>;
  getMessaging(): Promise<any | null>;
  saveMessaging(config: any, reason?: string): Promise<any>;
  logMessage(entry: { uid: string; stage: string; templateId: string; preview: string }): Promise<{ ok: boolean; id: string }>;
  listMessageLog(): Promise<any[]>;
  health(): Promise<{ at: number; checks: HealthCheck[] }>;
  /** Tenta ler um dado privado direto do navegador. Seguro = permissão negada. */
  probeRules(): Promise<HealthCheck>;
  costs(): Promise<CostsReport>;
  saveCosts(config: CostsConfig, reason?: string): Promise<{ ok: true }>;
}

export type CostsConfig = {
  usdBrl: number;
  fees: Record<string, { pct: number; fixed: number }>;
  fixed: { id: string; name: string; amountBrl: number }[];
  cloudBills: Record<string, number>;
};
export type CostMonth = {
  month: string; isCurrent: boolean;
  ai: { calls: number; images: number; errors: number; inTok: number; outTok: number; usd: number; brl: number; projectedBrl: number | null;
    users: number; perCallBrl: number; perUserBrl: number; top: { uid: string; email: string; calls: number; brl: number }[] };
  revenue: number; fees: number; byProvider: Record<string, { revenue: number; payments: number; fee: number }>;
  fixed: number; cloud: number | null; total: number; margin: number;
};
export type CostsReport = { config: CostsConfig; model: string; price: { inText: number; inAudio: number; out: number }; months: CostMonth[] };

export type HealthCheck = { id: string; label: string; status: 'ok' | 'warn' | 'fail'; detail: string; link?: string };
