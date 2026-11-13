// Modelo canônico de cobrança. Todo gateway é traduzido para isto,
// então o resto do sistema (acesso, métricas, admin) não sabe qual gateway veio.

export type ProviderId = "lastlink" | "kiwify" | "hotmart" | "cakto";

export const PROVIDERS: ProviderId[] = ["lastlink", "kiwify", "hotmart", "cakto"];

/** Tipos de evento normalizados. */
export type CanonicalType =
  | "PAYMENT_APPROVED"      // primeira compra aprovada
  | "PAYMENT_RENEWED"       // cobrança recorrente aprovada
  | "PAYMENT_PENDING"       // boleto/pix gerado, aguardando
  | "PAYMENT_FAILED"        // recusado / expirado
  | "RENEWAL_LATE"          // renovação em atraso (mantém acesso no período de carência)
  | "SUBSCRIPTION_CANCELED" // cancelou: mantém acesso até o fim do período pago
  | "SUBSCRIPTION_EXPIRED"  // expirou: corta acesso
  | "REFUNDED"              // reembolso: corta acesso
  | "CHARGEBACK"            // chargeback: corta acesso
  | "IGNORED";              // evento que não muda nada (carrinho abandonado etc.)

export type AccessStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"   // cancelado, ainda dentro do período pago
  | "expired"
  | "refunded"
  | "courtesy"   // acesso cortesia concedido pelo admin
  | "blocked";

export type PlanInterval = "month" | "quarter" | "semester" | "year" | "lifetime";

export interface Plan {
  id: string;               // ex: "monthly", "annual"
  name: string;
  price: number;            // em reais
  interval: PlanInterval;
  installmentsText?: string;
  highlight?: boolean;
  active: boolean;
  features?: string[];
  /** link de checkout por gateway */
  checkout: Partial<Record<ProviderId, string>>;
  /** ids de produto/oferta/plano no gateway, para mapear o evento ao plano */
  externalIds: Partial<Record<ProviderId, string[]>>;
}

export interface ProviderConfig {
  enabled: boolean;
  /** true quando o mapeamento foi validado com um payload real de teste */
  validated: boolean;
  label: string;
}

/** config/billing — leitura pública (o paywall usa). Sem segredos aqui. */
export interface BillingConfig {
  plans: Plan[];
  /** ordem de preferência; o paywall usa o primeiro habilitado que tem link */
  providerOrder: ProviderId[];
  providers: Record<ProviderId, ProviderConfig>;
  trialDays: number;
  graceDays: number;
  /** aceita o endpoint antigo da LastLink sem token (transição) */
  allowLegacyLastlink: boolean;
  updatedAt?: unknown;
}

/** Evento já traduzido por um adaptador. */
export interface NormalizedEvent {
  provider: ProviderId;
  externalEventId: string;     // id único do evento no gateway (idempotência)
  rawType: string;             // nome original do evento no gateway
  type: CanonicalType;
  email: string | null;
  name?: string | null;
  phone?: string | null;
  amount: number | null;       // valor efetivamente cobrado, em reais
  currency: string;
  externalPaymentId?: string | null;
  externalSubscriptionId?: string | null;
  externalProductIds: string[];
  intervalHint?: PlanInterval | null;
  occurredAt: Date;
  isTest: boolean;
  paymentMethod?: string | null;
  utm?: Record<string, string> | null;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  plans: [
    {
      id: "annual",
      name: "Plano Anual",
      price: 149.9,
      interval: "year",
      installmentsText: "ou até 5x no cartão",
      highlight: true,
      active: true,
      features: ["Acesso completo por 12 meses", "Economia frente ao mensal"],
      checkout: { lastlink: "https://lastlink.com/p/CA05DE2CE/checkout-payment/" },
      externalIds: {},
    },
    {
      id: "monthly",
      name: "Plano Mensal",
      price: 24.9,
      interval: "month",
      active: true,
      features: ["Cancele quando quiser", "Sem fidelidade"],
      checkout: { lastlink: "https://lastlink.com/p/CE5BD085C/checkout-payment/" },
      externalIds: {},
    },
  ],
  providerOrder: ["lastlink", "kiwify", "hotmart", "cakto"],
  providers: {
    lastlink: { enabled: true, validated: true, label: "LastLink" },
    kiwify: { enabled: false, validated: false, label: "Kiwify" },
    hotmart: { enabled: false, validated: false, label: "Hotmart" },
    cakto: { enabled: false, validated: false, label: "Cakto" },
  },
  trialDays: 3,
  graceDays: 3,
  allowLegacyLastlink: true,
};

export const INTERVAL_DAYS: Record<PlanInterval, number> = {
  month: 31,
  quarter: 92,
  semester: 183,
  year: 366,
  lifetime: 365 * 100,
};
