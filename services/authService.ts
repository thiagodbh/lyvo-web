type Unsubscribe = () => void;

class AuthService {
  private user: any = null;
  private listeners = new Set<(user: any) => void>();

  // O App costuma esperar algo tipo "onAuthStateChanged"
  onAuthStateChanged(callback: (user: any) => void): Unsubscribe {
    return this.onChange(callback);
  }

  // E em alguns lugares pode estar usando "onChange"
  onChange(callback: (user: any) => void): Unsubscribe {
    this.listeners.add(callback);

    // dispara imediatamente (isso tira o "Carregando" travado)
    queueMicrotask(() => {
      try { callback(this.user); } catch {}
    });

    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit() {
    for (const cb of this.listeners) {
      try { cb(this.user); } catch {}
    }
  }

  // aliases que o App pode usar
  async signIn(email: string, password: string) {
    return this.login(email, password);
  }

  async signOut() {
    this.logout();
  }

  // suas funções mock
  async login(email: string, password: string) {
    this.user = { uid: "mock-user", email };
    this.emit();
    return this.user;
  }

  logout() {
    this.user = null;
    this.emit();
  }

  getCurrentUser() {
    return this.user;
  }
}

export const authService = new AuthService();
