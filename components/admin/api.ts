import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../services/firebase'; // garante initializeApp
import type { AdminApi } from './types';

/** API real: tudo passa pela callable `adminApi`, que valida admin no servidor. */
export function createLiveApi(): AdminApi {
  const fn = httpsCallable(getFunctions(), 'adminApi', { timeout: 120000 });
  const call = async <T,>(action: string, data: Record<string, any> = {}): Promise<T> => {
    // `action` é a rota; nada em `data` pode sobrescrevê-la
    const r = await fn({ ...data, action });
    return r.data as T;
  };
  return {
    mode: 'live',
    whoami: () => call('whoami'),
    overview: () => call('overview'),
    listUsers: () => call('listUsers'),
    getUser: (uid) => call('getUser', { uid }),
    userAction: (uid, op, params) => call('userAction', { uid, ...params, op }),
    listBilling: () => call('listBilling', { limit: 1000 }),
    getEventRaw: (id) => call('getEventRaw', { id }),
    linkEvent: (eventId, uid, planId, reason) => call('linkEvent', { eventId, uid, planId, reason }),
    getConfig: () => call('getConfig'),
    saveConfig: (config, reason) => call('saveConfig', { config, reason }),
    gateways: () => call('gateways'),
    rotateToken: (provider) => call('rotateToken', { provider }),
    setNativeSecret: (provider, secret) => call('setNativeSecret', { provider, secret }),
    dryRun: (provider, payload) => call('dryRun', { provider, payload }),
    listAudit: () => call('listAudit'),
    recomputeUsage: () => call('recomputeUsage'),
    olimpoPing: () => call('olimpoPing'),
    olimpoSyncAll: () => call('olimpoSyncAll'),
    getMessaging: () => call('getMessaging'),
    saveMessaging: (config, reason) => call('saveMessaging', { config, reason }),
    logMessage: (entry) => call('logMessage', entry),
    listMessageLog: () => call('listMessageLog', { limit: 2000 }),
    health: () => call('health'),
    costs: () => call('costs'),
    saveCosts: (config, reason) => call('saveCosts', { config, reason }),
    probeRules: async () => {
      const base = { id: 'rules', label: 'Regras de segurança do banco (Firestore)', link: '' };
      try {
        await getDocs(query(collection(db, 'billingEvents'), limit(1)));
        return { ...base, status: 'fail' as const, detail: 'O navegador conseguiu ler pagamentos de todos os clientes. Publique o firestore.rules novo.' };
      } catch (e: any) {
        if (e?.code === 'permission-denied') return { ...base, status: 'ok' as const, detail: 'Dados de pagamento bloqueados para acesso direto pelo navegador.' };
        return { ...base, status: 'warn' as const, detail: `Não deu para testar: ${e?.message || e}` };
      }
    },
  };
}

/** Modo demo só existe em dev ou em build feito com VITE_ADMIN_DEMO=1. Nunca em produção. */
export const DEMO_ALLOWED: boolean = (() => {
  const env = (import.meta as any).env || {};
  return !!env.DEV || env.VITE_ADMIN_DEMO === '1';
})();
