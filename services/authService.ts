type AuthUser = { uid: string; email: string } | null;

class AuthService {
  private user: AuthUser = null;
  private listeners: Array<(u: AuthUser) => void> = [];

  private emit() {
    for (const cb of this.listeners) cb(this.user);
  }

  onChange(cb: (u: AuthUser) => void) {
    this.listeners.push(cb);
    // dispara imediatamente com o estado atual
    cb(this.user);

    // unsubscribe
    return () => {
      this.listeners = this.listeners.filter(x => x !== cb);
    };
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
