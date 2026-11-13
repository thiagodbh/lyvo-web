import { getFunctions, httpsCallable } from 'firebase/functions';
import '../../services/firebase'; // garante initializeApp
import type { AdminApi } from './types';

/** API real: tudo passa pela callable `adminApi`, que valida admin no servidor. */
export function createLiveApi(): AdminApi {
  const fn = httpsCallable(getFunctions(), 'adminApi', { timeout: 120000 });
  const call = async <T,>(action: string, data: Record<string, any> = {}): Promise<T> => {
    const r = await fn({ action, ...data });
    return r.data as T;
  };
  return {
    mode: 'live',
    whoami: () => call('whoami'),
    overview: () => call('overview'),
    listUsers: () => call('listUsers'),
    getUser: (uid) => call('getUser', { uid }),
    userAction: (uid, action, params) => call('userAction', { uid, action, ...params }),
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
  };
}

/** Modo demo só existe em dev ou em build feito com VITE_ADMIN_DEMO=1. Nunca em produção. */
export const DEMO_ALLOWED: boolean = (() => {
  const env = (import.meta as any).env || {};
  return !!env.DEV || env.VITE_ADMIN_DEMO === '1';
})();
