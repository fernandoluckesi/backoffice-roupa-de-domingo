import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { extractError, extractErrorCode } from "@/services/http";
import { FieldError, invalidProps, Loading } from "@/components/StateViews";

interface LocationState {
  from?: string;
}

type FieldErrors = Partial<Record<"email" | "password" | "code", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [errors, setErrors] = useState<FieldErrors>({});

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
    setErrors({});
  }

  /** Cada erro da API vai para o campo a que pertence. */
  function handleLoginError(err: unknown) {
    const errorCode = extractErrorCode(err);
    if (errorCode === "LOGIN_CODE_REQUIRED") {
      setStep("code");
      setCode("");
      setErrors({});
      setCodeInfo(extractError(err));
      return;
    }
    const message = extractError(err, "Não foi possível entrar.");
    if (step === "code") {
      if (errorCode === "LOGIN_CODE_INVALID") setCode("");
      setErrors({ code: message });
    } else if (errorCode === "EMAIL_NOT_VERIFIED") {
      setErrors({ email: message });
    } else {
      // Senha errada, conta bloqueada, limite de tentativas, API fora: o campo da senha
      setErrors({ password: message });
    }
  }

  function validate(): FieldErrors {
    if (step === "code") {
      return code.length === 6 ? {} : { code: "Digite os 6 dígitos que chegaram no seu e-mail." };
    }
    const found: FieldErrors = {};
    if (!email.trim()) found.email = "Informe o e-mail.";
    else if (!EMAIL_PATTERN.test(email.trim())) found.email = "E-mail inválido.";
    if (!password) found.password = "Informe a senha.";
    return found;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearNotice();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

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
    setErrors({});
    setResending(true);
    try {
      await login({ email: email.trim(), password, resendCode: true });
    } catch (err) {
      handleLoginError(err);
    }
    setResending(false);
  }

  /** Limpa o erro do campo assim que a pessoa volta a digitar nele. */
  const clearError = (field: keyof FieldErrors) =>
    errors[field] && setErrors((current) => ({ ...current, [field]: undefined }));

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

        {notice && <div className="alert alert--warning">{notice}</div>}

        {step === "credentials" ? (
          <>
            <h1 className="auth-card__title">Entrar</h1>
            <label className="field">
              <span className="field__label">E-mail</span>
              <input
                className={`input${errors.email ? " input--invalid" : ""}`}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                autoFocus
                {...invalidProps("login-email-error", errors.email)}
              />
              <FieldError id="login-email-error" message={errors.email} />
            </label>
            <label className="field">
              <span className="field__label">Senha</span>
              <input
                className={`input${errors.password ? " input--invalid" : ""}`}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                {...invalidProps("login-password-error", errors.password)}
              />
              <FieldError id="login-password-error" message={errors.password} />
            </label>
          </>
        ) : (
          <>
            <h1 className="auth-card__title">Código de acesso</h1>
            <p className="muted">{codeInfo ?? "Enviamos um código de 6 dígitos para o seu e-mail."}</p>
            <label className="field">
              <span className="field__label">Código</span>
              <input
                className={`input input--otp${errors.code ? " input--invalid" : ""}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  clearError("code");
                }}
                autoFocus
                {...invalidProps("login-code-error", errors.code)}
              />
              <FieldError id="login-code-error" message={errors.code} />
            </label>
          </>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting || resending}>
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
