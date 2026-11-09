import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "./StateViews";

/** Toda rota alem do /login exige sessao de ADMIN aberta com o codigo do e-mail. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="auth-screen">
        <Loading label="Verificando a sessão…" />
      </div>
    );
  }
  if (status === "anonymous") {
    // So o caminho (pedido/numero) vai no state, nunca dados pessoais
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
