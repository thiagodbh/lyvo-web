class AuthService {
  private user: any = null;

  async login(email: string, password: string) {
    this.user = {
      uid: "mock-user",
      email
    };
    return this.user;
  }

  logout() {
    this.user = null;
  }

  getCurrentUser() {
    return this.user;
  }
}

export const authService = new AuthService();
