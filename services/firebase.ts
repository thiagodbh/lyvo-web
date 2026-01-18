import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMjEvIi1LIMXMxYPfaB6-042hs8bApK2k",
  authDomain: "lyvo-web.firebaseapp.com",
  projectId: "lyvo-web",
  storageBucket: "lyvo-web.appspot.com",
  messagingSenderId: "501648718670",
  appId: "1:501648718670:web:cc5a8e6e2119cc8222bc1f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
