// services/authService.ts
export type User = { uid: string; email: string } | null;

type StoredUser = { uid: string; email: string; password: string };

const LS_USERS_KEY = "lyvo_mock_users";
const LS_SESSION_KEY = "lyvo_mock_session_uid";

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
}

function setSession(uid: string | null) {
  if (uid) localStorage.setItem(LS_SESSION_KEY, uid);
  else localStorage.removeItem(LS_SESSION_KEY);
}

function getSessionUid(): string | null {
  return localStorage.getItem(LS_SESSION_KEY);
}

class MockAuthService {
  private user: User = null;
  private listeners = new Set<(u: User) => void>();

  constructor() {
    const uid = getSessionUid();
    if (uid) {
      const found = readUsers().find((u) => u.uid === uid);
      if (found) this.user = { uid: found.uid, email: found.email };
    }
  }

  private emit() {
    for (const cb of this.listeners) cb(this.user);
  }

  onChange(callback: (u: User) => void) {
    this.listeners.add(callback);
    callback(this.user);
    return () => this.listeners.delete(callback);
  }

  getCurrentUser() {
    return this.user;
  }

  async signUp(email: string, password: string) {
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("E-mail já cadastrado.");
    }

    const uid = `mock-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`;
    users.push({ uid, email, password });
    writeUsers(users);

    this.user = { uid, email };
    setSession(uid);
    this.emit();
    return this.user;
  }

  async signIn(email: string, password: string) {
    const users = readUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error("Usuário não encontrado.");
    if (found.password !== password) throw new Error("Senha incorreta.");

    this.user = { uid: found.uid, email: found.email };
    setSession(found.uid);
    this.emit();
    return this.user;
  }

  async signOut() {
    this.user = null;
    setSession(null);
    this.emit();
  }
}

export const authService = new MockAuthService();
