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
...
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
