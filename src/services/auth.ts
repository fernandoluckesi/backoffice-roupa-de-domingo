import { api } from "./http";
import type { AuthUser, LoginPayload, LoginResponse } from "@/types";

export const authService = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    const { data } = await api.post<LoginResponse>("/auth/login", payload);
    return data.user;
  },
  async me(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>("/auth/me");
    return data;
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
};
