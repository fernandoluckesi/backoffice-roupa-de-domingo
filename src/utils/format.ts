const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const longDateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/** Centavos inteiros -> "R$ 1.234,56" */
export function formatMoney(cents: number | null | undefined): string {
  return brl.format((cents ?? 0) / 100);
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateFmt.format(date) : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFmt.format(date) : "—";
}

export function formatLongDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? longDateFmt.format(date) : "—";
}

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** "01310100" -> "01310-100" */
export function formatCep(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = onlyDigits(value).padStart(8, "0").slice(-8);
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** CPF (11) ou CNPJ (14) formatado; outro tamanho volta como veio. */
export function formatDocument(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return value || "—";
}

/** CPF mascarado: so os 2 ultimos digitos aparecem. */
export function maskDocument(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (!d) return "—";
  if (d.length === 11) return `•••.•••.•••-${d.slice(9)}`;
  return `${"•".repeat(Math.max(d.length - 2, 0))}${d.slice(-2)}`;
}

export function formatPhone(value: string | null | undefined): string {
  let d = onlyDigits(value);
  if (!d) return "—";
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value || "—";
}

/** Gramas -> "0,450 kg" */
export function formatWeight(grams: number | null | undefined): string {
  if (grams == null) return "—";
  return `${(grams / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Data local (YYYY-MM-DD), para inputs type=date. */
export function localDateInputValue(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "YYYY-MM-DD" de um input de data -> instante ISO no inicio (ou fim) do dia LOCAL.
 * Evita o bug de fuso: new Date("2026-11-09") e meia-noite UTC = 21h do dia anterior no Brasil.
 */
export function dateInputToIso(value: string | null | undefined, endOfDay = false): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = endOfDay
    ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
    : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  return date.toISOString();
}
