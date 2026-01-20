// services/authService.ts
import { store } from "./mockStore";

type User = { uid: string; email: string } | null;

class MockAuthService {
  private user: User = null;
  private listeners = new Set<(user: User) => void>();

  private emit() {
    for (const cb of this.listeners) cb(this.user);
  }

  async signIn(email: string, password: string) {
    // mock login
    this.user = { uid: "mock-user", email };
    store.setUser(this.user.uid);
    this.emit();
    return this.user;
  }

  async signUp(email: string, password: string) {
    // mock signup = mock login
    return this.signIn(email, password);
  }

  async signOut() {
    this.user = null;
    store.clearUser();
    this.emit();
  }

  // ✅ o App.tsx espera isso (pelo seu print do erro e buscas)
  onChange(callback: (user: User) => void) {
    this.listeners.add(callback);
    callback(this.user); // dispara estado inicial
    return () => this.listeners.delete(callback);
  }

  getCurrentUser() {
    return this.user;
  }
}

export const authService = new MockAuthService();
