import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

type AccessResult = {
  allowed: boolean;
  reason: "ACTIVE" | "TRIAL" | "EXPIRED" | "NO_USER_DOC";
};

export async function checkUserAccess(uid: string): Promise<AccessResult> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { allowed: false, reason: "NO_USER_DOC" };
  }

  const data = snap.data() as any;

  // pago/liberado
  if (data?.active === true) {
    return { allowed: true, reason: "ACTIVE" };
  }

  // trial liberado por data
  const trialEndsAt: Timestamp | undefined = data?.trialEndsAt;
  if (data?.plan === "trial" && trialEndsAt?.toDate) {
    const ends = trialEndsAt.toDate().getTime();
    const now = Date.now();
    if (ends > now) return { allowed: true, reason: "TRIAL" };
  }

  return { allowed: false, reason: "EXPIRED" };
}
