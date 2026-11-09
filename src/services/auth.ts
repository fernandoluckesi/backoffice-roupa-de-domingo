import { api } from "./http";
import type { AuthUser, LoginPayload, LoginResponse } from "@/types";

/** Login proprio do backoffice (/api/admin/auth), com cookie de sessao separado do da loja. */
export const authService = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    const { data } = await api.post<LoginResponse>("/admin/auth/login", payload);
    return data.admin;
  },
  async me(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>("/admin/auth/me");
    return data;
  },
  async logout(): Promise<void> {
    await api.post("/admin/auth/logout");
  },
};
