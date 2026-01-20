import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAMjEviILIMXMxYPfaB6-042hs8bApK2k",
  authDomain: "lyvo-web.firebaseapp.com",
  projectId: "lyvo-web",
  storageBucket: "lyvo-web.firebasestorage.app",
  messagingSenderId: "501648718670",
  appId: "1:501648718670:web:cc5a8e6e2119cc8222bc1f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
