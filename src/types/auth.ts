export type UserRole = "CUSTOMER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Sessao aberta com o codigo de login enviado por e-mail (exigido nas rotas de admin) */
  loginCodeVerified: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  /** Codigo de 6 digitos enviado ao e-mail (segunda etapa) */
  code?: string;
  /** Pede um novo codigo mesmo que o anterior ainda valha */
  resendCode?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
