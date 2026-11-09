import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { extractError, extractErrorCode } from "@/services/http";
import { InlineError, Loading } from "@/components/StateViews";

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const { status, login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;
  const target = from && from.startsWith("/") && !from.startsWith("/login") ? from : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  /** Texto da API dizendo para onde o codigo foi (e-mail mascarado) */
  const [codeInfo, setCodeInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="auth-screen">
        <Loading label="Verificando a sessão…" />
      </div>
    );
  }
  if (status === "authenticated" && !submitting) return <Navigate to={target} replace />;

  function backToCredentials() {
    setStep("credentials");
    setCode("");
    setCodeInfo(null);
    setError(null);
  }

  /** Senha certa de admin: a API envia o codigo e responde LOGIN_CODE_REQUIRED. */
  function handleLoginError(err: unknown) {
    const errorCode = extractErrorCode(err);
    if (errorCode === "LOGIN_CODE_REQUIRED") {
      setStep("code");
      setCode("");
      setCodeInfo(extractError(err));
      return;
    }
    if (errorCode === "LOGIN_CODE_INVALID") setCode("");
    setError(extractError(err, "Não foi possível entrar."));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    clearNotice();
    if (step === "code" && code.length !== 6) {
      setError("Digite os 6 dígitos que chegaram no seu e-mail.");
      return;
    }
    setSubmitting(true);
    try {
      const ok = await login({ email: email.trim(), password, ...(step === "code" ? { code } : {}) });
      if (ok) {
        navigate(target, { replace: true });
        return;
      }
      // Conta sem papel ADMIN: o contexto ja deslogou e preencheu o aviso
      backToCredentials();
      setPassword("");
    } catch (err) {
      handleLoginError(err);
    }
    setSubmitting(false);
  }

  async function resend() {
    setError(null);
    setResending(true);
    try {
      await login({ email: email.trim(), password, resendCode: true });
    } catch (err) {
      handleLoginError(err);
    }
    setResending(false);
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="brand brand--dark">
          <span className="brand__mark">RD</span>
          <span className="brand__text">
            Roupa de Domingo
            <small>Backoffice</small>
          </span>
        </div>

        {step === "credentials" ? (
          <>
            <h1 className="auth-card__title">Entrar</h1>
            <label className="field">
              <span className="field__label">E-mail</span>
              <input
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field__label">Senha</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          </>
        ) : (
          <>
            <h1 className="auth-card__title">Código de acesso</h1>
            <p className="muted">{codeInfo ?? "Enviamos um código de 6 dígitos para o seu e-mail."}</p>
            <label className="field">
              <span className="field__label">Código</span>
              <input
                className="input input--otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </label>
          </>
        )}

        {notice && !error && <div className="alert alert--warning">{notice}</div>}
        <InlineError message={error} />

        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={submitting || resending || !email || !password}
        >
          {submitting ? "Entrando…" : step === "code" ? "Confirmar código" : "Entrar"}
        </button>
        {step === "code" && (
          <>
            <button type="button" className="btn btn--link" disabled={resending || submitting} onClick={resend}>
              {resending ? "Enviando…" : "Reenviar código"}
            </button>
            <button type="button" className="btn btn--link" onClick={backToCredentials}>
              Voltar
            </button>
          </>
        )}
      </form>
    </div>
  );
}
