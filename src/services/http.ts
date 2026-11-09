import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "@/types";

/**
 * Sessao: cookie httpOnly (rd_session) definido pelo backend. O JavaScript nao le nem
 * guarda o token: nada de sessao no localStorage.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 30000,
  withCredentials: true,
  // X-Requested-With e a trava anti-CSRF exigida pela API em toda requisicao que altera dados
  headers: { "Content-Type": "application/json", "X-Requested-With": "rd-web" },
});

type Handler = () => void;
let onUnauthorized: Handler | null = null;
let onLoginCodeRequired: Handler | null = null;

/** Chamado quando a sessao expira/e revogada no meio do uso. */
export function setUnauthorizedHandler(handler: Handler | null): void {
  onUnauthorized = handler;
}

/** Chamado quando uma rota de admin recusa a sessao por nao ter passado pelo codigo do e-mail. */
export function setLoginCodeRequiredHandler(handler: Handler | null): void {
  onLoginCodeRequired = handler;
}

function isLoginCodeRequiredError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 403 &&
    (error.response.data as Partial<ApiErrorBody> | undefined)?.error === "LOGIN_CODE_REQUIRED"
  );
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = String(error.config?.url ?? "");
    const status = error.response?.status;
    // Login errado tambem e 401, e /auth/me sem sessao e o caminho normal: nao sao "sessao expirada"
    if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/me")) {
      onUnauthorized?.();
    }
    if (url.startsWith("/admin") && isLoginCodeRequiredError(error)) {
      onLoginCodeRequired?.();
    }
    return Promise.reject(error);
  },
);

/** Codigo de erro da API (ex.: "LOGIN_CODE_REQUIRED"), quando houver. */
export function extractErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as Partial<ApiErrorBody> | undefined)?.error;
  }
  return undefined;
}

export function extractStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** Mensagem legivel do erro: usa o `message` da API quando existir. */
export function extractError(error: unknown, fallback = "Algo deu errado. Tente de novo."): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as Partial<ApiErrorBody> | undefined)?.message;
    if (Array.isArray(message) && message.length > 0) return message.join(" ");
    if (typeof message === "string" && message) return message;
    const status = error.response?.status;
    if (status === 429) return "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.";
    if (status === 404) return "Não encontrado.";
    if (status && status >= 500) return "O servidor teve um problema. Tente de novo em instantes.";
    if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
      return "A API não respondeu. Verifique a conexão e tente de novo.";
    }
  }
  return fallback;
}
