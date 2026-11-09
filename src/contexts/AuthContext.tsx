import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "@/services/auth";
import { extractStatus, setLoginCodeRequiredHandler, setUnauthorizedHandler } from "@/services/http";
import type { AuthUser, LoginPayload } from "@/types";

export const NO_ACCESS_MESSAGE = "Esta conta não tem acesso ao backoffice.";
export const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre de novo.";
export const LOGIN_CODE_MESSAGE = "Entre com e-mail e senha para receber o código de acesso no seu e-mail.";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Mensagem a exibir na tela de login (sem acesso, sessao expirada, falha ao checar sessao) */
  notice: string | null;
  /** Faz login. Lanca o erro da API; resolve false quando a conta nao e ADMIN. */
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: (notice?: string) => Promise<void>;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dropSession = useCallback((message: string | null) => {
    setUser(null);
    setStatus("anonymous");
    setNotice(message);
  }, []);

  const logout = useCallback(
    async (message?: string) => {
      try {
        await authService.logout();
      } catch {
        /* sessao ja pode ter expirado: segue limpando a tela */
      }
      dropSession(message ?? null);
    },
    [dropSession],
  );

  // Checagem inicial da sessao (cookie httpOnly: so o backend sabe se ha sessao)
  useEffect(() => {
    let active = true;
    authService
      .me()
      .then(async (me) => {
        if (!active) return;
        if (me.role !== "ADMIN") {
          await logout(NO_ACCESS_MESSAGE);
          return;
        }
        // Sessao aberta fora do backoffice (ex.: pela loja) nao passou pelo codigo do e-mail
        if (!me.loginCodeVerified) {
          await logout(LOGIN_CODE_MESSAGE);
          return;
        }
        setUser(me);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const code = extractStatus(error);
        dropSession(code === 401 || code === 403 ? null : "Não foi possível verificar a sessão. A API está no ar?");
      });
    return () => {
      active = false;
    };
  }, [dropSession, logout]);

  useEffect(() => {
    setUnauthorizedHandler(() => dropSession(SESSION_EXPIRED_MESSAGE));
    setLoginCodeRequiredHandler(() => void logout(LOGIN_CODE_MESSAGE));
    return () => {
      setUnauthorizedHandler(null);
      setLoginCodeRequiredHandler(null);
    };
  }, [dropSession, logout]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const loggedUser = await authService.login(payload);
      if (loggedUser.role !== "ADMIN") {
        await logout(NO_ACCESS_MESSAGE);
        return false;
      }
      setUser(loggedUser);
      setStatus("authenticated");
      setNotice(null);
      return true;
    },
    [logout],
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, notice, login, logout, clearNotice }),
    [status, user, notice, login, logout, clearNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
