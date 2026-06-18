import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { loginApi, registerApi, logoutApi, isLoggedIn, getCurrentUsername } from '../services/api';

interface AuthState {
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  username: null, loading: true,
  login: async () => {}, register: async () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) setUsername(getCurrentUsername());
    setLoading(false);
  }, []);

  const login = useCallback(async (u: string, p: string) => {
    const result = await loginApi(u, p);
    setUsername(result.username);
  }, []);

  const register = useCallback(async (u: string, p: string) => {
    const result = await registerApi(u, p);
    setUsername(result.username);
  }, []);

  const logout = useCallback(() => {
    logoutApi();
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ username, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
