/** Usuario da equipe (tabela admin_users do backend, separada dos clientes da loja). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
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
  admin: AuthUser;
}
