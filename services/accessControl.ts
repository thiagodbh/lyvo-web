// src/services/accessControl.ts
// A decisão de acesso usa a mesma regra do servidor (functions/src/billing/engine.ts → hasAccess).
// O servidor é quem grava `access`; o cliente só lê. O trial inicial continua sendo criado aqui.
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getTrialDays } from "./authService";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAID = ["active", "past_due", "canceled", "courtesy"];

const toMs = (v: any): number | null =>
  typeof v?.toMillis === "function" ? v.toMillis() : typeof v === "number" ? v : null;

export function hasAccess(user: any, now = Date.now()): boolean {
  if (!user) return false;
  const a = user.access;
  if (user.blocked === true || a?.status === "blocked") return false;
  if (a && PAID.includes(a.status)) {
    const end = Math.max(toMs(a.currentPeriodEnd) ?? 0, toMs(a.graceUntil) ?? 0);
    if (!a.currentPeriodEnd && a.status !== "canceled") return true;
    return end > now;
  }
  if (!a && user.active === true) return true;
  const trialEnd = toMs(user.trialEndsAt);
  return !!trialEnd && trialEnd > now;
}

export async function checkUserAccess(uid: string): Promise<boolean> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const nowMs = Date.now();

  // Doc ainda não existe (corrida no cadastro): cria trial e libera
  if (!snap.exists()) {
    await setDoc(userRef, {
      active: false,
      plan: "trial",
      trialEndsAt: Timestamp.fromDate(new Date(nowMs + (await getTrialDays()) * DAY_MS)),
      createdAt: Timestamp.now(),
    }, { merge: true });
    return true;
  }

  const data: any = snap.data();

  // Conta sem trial registrado e sem acesso pago: inicia o trial
  if (!data.trialEndsAt && !data.access && data.active !== true) {
    await setDoc(userRef, { trialEndsAt: Timestamp.fromDate(new Date(nowMs + (await getTrialDays()) * DAY_MS)), plan: "trial", active: false }, { merge: true });
    return true;
  }

  return hasAccess(data, nowMs);
}
