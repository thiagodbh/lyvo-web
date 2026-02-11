// src/components/AccessGuard.tsx
import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { store } from '../services/firestoreStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AccessGuardProps {
  children: React.ReactNode;
  paywallComponent: React.ReactNode;
}

const AccessGuard: React.FC<AccessGuardProps> = ({ children, paywallComponent }) => {
  const [status, setStatus] = useState<'loading' | 'granted' | 'denied'>('loading');

  useEffect(() => {
    const checkAccess = async () => {
      const user = authService.getCurrentUser();
      
      if (!user) {
        setStatus('denied');
        return;
      }

      // GARANTIA: Força a store a reconhecer o usuário antes de qualquer renderização
      // Isso resolve o erro de "dados não salvando"
      store.setUser(user.uid);

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          
          // 1. Se for plano ativo, libera direto
          if (data.active === true && data.plan === 'premium') {
            setStatus('granted');
            return;
          }

          // 2. Lógica dos 4 dias (Trial)
          if (data.createdAt) {
            const createdAt = data.createdAt.toDate(); // Converte Timestamp do Firebase
            const now = new Date();
            const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

            if (diffInDays <= 4) {
              setStatus('granted');
              return;
            }
          }
        }
        
        setStatus('denied');
      } catch (error) {
        console.error("Erro ao validar acesso:", error);
        setStatus('denied');
      }
    };

    checkAccess();
  }, []);

  if (status === 'loading') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Validando período de teste...</div>
      </div>
    );
  }

  return status === 'granted' ? <>{children}</> : <>{paywallComponent}</>;
};

export default AccessGuard;
