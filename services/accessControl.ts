import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const TRIAL_DAYS = 3;

export type AccessStatus = {
  allowed: boolean;
  reason: "PAID" | "TRIAL_ACTIVE" | "TRIAL_EXPIRED" | "NO_USER";
  trialEndsAt?: number;
};

function addDaysMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

export async function ensureUserEntitlement(): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const db = getFirestore();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // Se não existe doc do user ainda, cria com trial de 3 dias
  if (!snap.exists()) {
    const now = Date.now();
    const trialEndsAt = now + addDaysMs(TRIAL_DAYS);

    await setDoc(ref, {
      createdAt: serverTimestamp(),
      trialStartedAt: now,
      trialEndsAt,
      entitlement: "TRIAL", // ou "PAID"
    }, { merge: true });

    return;
  }

  // Se existe mas não tem trial configurado, cria sem sobrescrever o resto
  const data: any = snap.data();
  if (!data.trialEndsAt && data.entitlement !== "PAID") {
    const now = Date.now();
    await setDoc(ref, {
      trialStartedAt: now,
      trialEndsAt: now + addDaysMs(TRIAL_DAYS),
      entitlement: data.entitlement ?? "TRIAL",
    }, { merge: true });
  }
}

export async function getAccessStatus(): Promise<AccessStatus> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return { allowed: false, reason: "NO_USER" };

  const db = getFirestore();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { allowed: false, reason: "TRIAL_EXPIRED" };

  const data: any = snap.data();

  if (data.entitlement === "PAID") {
    return { allowed: true, reason: "PAID" };
  }

  const trialEndsAt = Number(data.trialEndsAt || 0);
  const now = Date.now();

  if (trialEndsAt && now <= trialEndsAt) {
    return { allowed: true, reason: "TRIAL_ACTIVE", trialEndsAt };
  }

  return { allowed: false, reason: "TRIAL_EXPIRED", trialEndsAt };
}
