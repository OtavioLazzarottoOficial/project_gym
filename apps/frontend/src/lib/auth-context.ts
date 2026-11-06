import { createContext, useContext } from 'react';
import type { LoginResponse } from './accounts-api.ts';

interface AuthContextValue {
  session: LoginResponse | null;
  loading: boolean;
  notice: string;
  signIn: (email: string, password: string) => Promise<LoginResponse>;
  signOut: () => Promise<void>;
  expire: () => void;
  passwordChanged: () => void;
}
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthProvider is required.');
  }

  return auth;
}

export const roleLabels = {
  admin: 'Administrador',
  instructor: 'Instrutor',
  student: 'Aluno',
};
