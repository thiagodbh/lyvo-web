import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../services/firebase';
import { authService } from '../services/authService';

interface AccessGuardProps {
  children: React.ReactNode;
  paywallComponent: React.ReactNode;
}

const AccessGuard: React.FC<AccessGuardProps> = ({ children, paywallComponent }) => {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked'>('loading');
  const user = authService.getCurrentUser();

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      let startDate: any;

      if (!userDoc.exists()) {
        // Primeiro acesso: grava a data de início do trial
        startDate = new Date();
        await setDoc(userDocRef, {
          email: user.email,
          trialStartDate: serverTimestamp(),
          isSubscribed: false
        }, { merge: true });
      } else {
        const data = userDoc.data();
        // Se já for assinante, libera direto
        if (data.isSubscribed) {
          setStatus('allowed');
          return;
        }
        startDate = data.trialStartDate?.toDate() || new Date();
      }

      // Cálculo dos 7 dias
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays >= 7) {
        setStatus('blocked');
      } else {
        setStatus('allowed');
      }
    };

    checkAccess();
  }, [user]);

  if (status === 'loading') return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (status === 'blocked') return <>{paywallComponent}</>;
  
  return <>{children}</>;
};

export default AccessGuard;
