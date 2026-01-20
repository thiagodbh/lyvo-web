type Unsubscribe = () => void;

class AuthService {
  private user: any = null;
  private listeners = new Set<(user: any) => void>();

  // compatível com o App.tsx (ele espera isso)
  onChange(callback: (user: any) => void): Unsubscribe {
    this.listeners.add(callback);

    // dispara imediatamente com o estado atual
    try {
      callback(this.user);
    } catch {}

    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit() {
    for (const cb of this.listeners) {
      try {
        cb(this.user);
      } catch {}
    }
  }

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
