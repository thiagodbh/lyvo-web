import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAMjEvIi1LIMXMxYPfaB6-042hs8bApK2k",
  authDomain: "lyvo-web.firebaseapp.com",
  projectId: "lyvo-web",
  storageBucket: "lyvo-web.firebasestorage.app",
  messagingSenderId: "501648718670",
  appId: "1:501648718670:web:cc5a8e6e2119cc8222bc1f",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Messaging só funciona em browsers que suportam service workers
export const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};
