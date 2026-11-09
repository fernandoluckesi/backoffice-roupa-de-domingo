import type { ReactNode } from "react";
import { extractError } from "@/services/http";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Não foi possível carregar.",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="state state--error" role="alert">
      <strong>{title}</strong>
      <span>{extractError(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  );
}

/**
 * Erro de um campo de formulario: vai logo abaixo do input a que pertence.
 * O input aponta para ele com aria-describedby={id} e recebe a classe input--invalid.
 */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <small id={id} className="field__error" role="alert">
      {message}
    </small>
  );
}

/** Classe e atributos de acessibilidade do input conforme o erro do campo. */
export function invalidProps(errorId: string, message?: string | null) {
  return message
    ? { "aria-invalid": true as const, "aria-describedby": errorId }
    : {};
}

/** Erro geral (que nao pertence a um campo especifico). */
export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert--danger" role="alert">
      {message}
    </div>
  );
}
