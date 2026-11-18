import React, { useEffect, useState } from 'react';
import type { AdminApi } from './types';

export const ApiCtx = React.createContext<AdminApi>(null as any);
export const useApi = () => React.useContext(ApiCtx);

/** Navegação por hash: #/users?filter=past_due */
export function useRoute() {
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { path: path || 'overview', params: new URLSearchParams(qs || '') };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const h = () => setRoute(parse());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return route;
}
export const go = (to: string) => { window.location.hash = `#/${to}`; };

