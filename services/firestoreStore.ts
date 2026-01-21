// services/firestoreStore.ts
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * ⚠️ CONTRATO:
 * - NÃO importa authService
 * - UID é passado pelo App / caller
 * - Mesma API do mockStore
 */

class FirestoreStore {
  private uid: string | null = null;

  setUser(uid: string) {
    this.uid = uid;
  }

  clearUser() {
    this.uid = null;
  }

  // ---------------- TRANSAÇÕES ----------------

  streamTransactions(callback: (data: any[]) => void) {
    if (!this.uid) return () => {};

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', this.uid)
    );

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      callback(data);
    });
  }

  async addTransaction(tx: any) {
    if (!this.uid) return;

    await addDoc(collection(db, 'transactions'), {
      ...tx,
      uid: this.uid,
      createdAt: Timestamp.now(),
    });
  }

  async deleteTransaction(id: string) {
    await deleteDoc(doc(db, 'transactions', id));
  }

  // ---------------- EVENTOS ----------------

  streamEvents(callback: (data: any[]) => void) {
    if (!this.uid) return () => {};

    const q = query(
      collection(db, 'events'),
      where('uid', '==', this.uid)
    );

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      callback(data);
    });
  }

  async addEvent(event: any) {
    if (!this.uid) return;

    await addDoc(collection(db, 'events'), {
      ...event,
      uid: this.uid,
      createdAt: Timestamp.now(),
    });
  }

  async deleteEvent(id: string) {
    await deleteDoc(doc(db, 'events', id));
  }
}

export const store = new FirestoreStore();
