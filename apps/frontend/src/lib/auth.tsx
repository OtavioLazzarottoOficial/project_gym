import { useEffect, useState, type ReactNode } from 'react';
import {
  ApiError,
  currentAccount,
  login,
  logout,
  type LoginResponse,
} from './accounts-api.ts';

import { AuthContext } from './auth-context.ts';

const key = 'project-gym.session';

function forgetStoredSession() {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Session still works in memory if storage is unavailable. */
  }
}

function storeSession(session: LoginResponse) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        token: session.access_token,
        expires_at: session.expires_at,
      }),
    );
  } catch {
    /* Keep the current session in memory. */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  function expire() {
    forgetStoredSession();
    setSession(null);
    setNotice('Sua sessão expirou. Entre novamente para continuar.');
  }

  function passwordChanged() {
    forgetStoredSession();
    setSession(null);
    setNotice('Senha alterada. Entre novamente com sua nova senha.');
  }

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const raw = sessionStorage.getItem(key);

        if (!raw) {
          return;
        }

        const stored: unknown = JSON.parse(raw);

        if (
          typeof stored !== 'object' ||
          stored === null ||
          !('token' in stored) ||
          typeof stored.token !== 'string' ||
          !('expires_at' in stored) ||
          typeof stored.expires_at !== 'string' ||
          !Number.isFinite(Date.parse(stored.expires_at)) ||
          Date.parse(stored.expires_at) <= Date.now()
        ) {
          forgetStoredSession();
          return;
        }

        const user = await currentAccount(stored.token);

        if (active) {
          setSession({
            access_token: stored.token,
            expires_at: stored.expires_at,
            user,
          });
        }
      } catch {
        if (active) {
          forgetStoredSession();
          setNotice('Não foi possível recuperar seu acesso. Entre novamente.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void restore();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timer = setTimeout(
      () => {
        forgetStoredSession();
        setSession(null);
        setNotice('Sua sessão expirou. Entre novamente para continuar.');
      },
      Math.max(0, Date.parse(session.expires_at) - Date.now()),
    );

    return () => clearTimeout(timer);
  }, [session]);

  async function signIn(email: string, password: string) {
    const result = await login(email, password);
    storeSession(result);
    setSession(result);
    setNotice('');

    return result;
  }

  async function signOut() {
    if (session) {
      try {
        await logout(session.access_token);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }
      }
    }

    forgetStoredSession();
    setSession(null);
    setNotice('Você saiu da sua conta.');
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        notice,
        signIn,
        signOut,
        expire,
        passwordChanged,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
