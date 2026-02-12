// src/services/accessControl.ts
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function checkUserAccess(uid: string): Promise<boolean> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
  const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + THREE_DAYS_MS));

  await setDoc(
    userRef,
    {
      trialEndsAt,
      plan: "trial",
      active: false,
    },
    { merge: true }
  );

  return true;
}

  const data: any = snap.data();
  const nowMs = Date.now();

  // Assinante ativo
  if (data.active === true) return true;

  // Se não existe trialEndsAt ainda, cria na primeira vez
  if (!data.trialEndsAt) {
    const trialEndsAt = Timestamp.fromDate(new Date(nowMs + THREE_DAYS_MS));

    await setDoc(
      userRef,
      {
        trialEndsAt,
        plan: "trial",
        active: false,
      },
      { merge: true }
    );

    return true;
  }

  // trialEndsAt pode vir como Timestamp
  const trialEndsMs =
    typeof data.trialEndsAt?.toMillis === "function"
      ? data.trialEndsAt.toMillis()
      : typeof data.trialEndsAt === "number"
      ? data.trialEndsAt
      : null;

  if (!trialEndsMs) return false;

  // Dentro do trial
  return nowMs < trialEndsMs;
}
