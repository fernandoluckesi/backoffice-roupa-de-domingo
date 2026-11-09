import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ordersService } from "@/services/orders";
import { extractError } from "@/services/http";
import { InlineError } from "./StateViews";
import { FULFILLMENT_STATUS_LABEL, FULFILLMENT_STEPS, serviceForMethod } from "@/utils/status";
import {
  correiosTrackingUrl,
  labelsUrl,
  normalizeTrackingCode,
  TRACKING_CODE_PATTERN,
} from "@/utils/links";
import { formatDateTime, formatWeight } from "@/utils/format";
import type { FulfillmentStatus, FulfillmentUpdatePayload, OrderDetail, ServiceCode } from "@/types";

interface Transition {
  to: FulfillmentStatus;
  label: string;
  back?: boolean;
}

/** Transicoes validas (espelho do backend; qualquer outra volta 400). */
const TRANSITIONS: Record<FulfillmentStatus, Transition[]> = {
  QUEUED: [{ to: "IN_PRODUCTION", label: "Iniciar produção" }],
  IN_PRODUCTION: [
    { to: "PACKED", label: "Marcar como embalado" },
    { to: "QUEUED", label: "Voltar para “A produzir”", back: true },
  ],
  PACKED: [
    { to: "SHIPPED", label: "Postar" },
    { to: "IN_PRODUCTION", label: "Voltar para “Em produção”", back: true },
  ],
  SHIPPED: [{ to: "DELIVERED", label: "Confirmar entrega" }],
  DELIVERED: [],
};

const STEP_DATE: Partial<Record<FulfillmentStatus, keyof NonNullable<OrderDetail["fulfillment"]>>> = {
  QUEUED: "createdAt",
  IN_PRODUCTION: "productionStartedAt",
  PACKED: "packedAt",
  SHIPPED: "shippedAt",
  DELIVERED: "deliveredAt",
};

function numberOrNull(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

function toField(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

interface PackageForm {
  serviceCode: ServiceCode | "";
  weight: string;
  length: string;
  width: string;
  height: string;
  internalNotes: string;
  trackingCode: string;
}

function formFromOrder(order: OrderDetail): PackageForm {
  const f = order.fulfillment;
  return {
    serviceCode: f?.serviceCode ?? serviceForMethod(order.shippingMethod),
    weight: toField(f?.packageWeightGrams),
    length: toField(f?.packageLengthCm),
    width: toField(f?.packageWidthCm),
    height: toField(f?.packageHeightCm),
    internalNotes: f?.internalNotes ?? "",
    trackingCode: f?.trackingCode ?? "",
  };
}

export function FulfillmentPanel({ order, onUpdated }: { order: OrderDetail; onUpdated: (order: OrderDetail) => void }) {
  const fulfillment = order.fulfillment;

  const [note, setNote] = useState("");
  const [postTracking, setPostTracking] = useState(fulfillment?.trackingCode ?? "");
  const [statusBusy, setStatusBusy] = useState<FulfillmentStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [form, setForm] = useState<PackageForm>(() => formFromOrder(order));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Pedido atualizado (PATCH/recarga): realinha os campos com o que o backend guardou
  useEffect(() => {
    setForm(formFromOrder(order));
    setPostTracking(order.fulfillment?.trackingCode ?? "");
  }, [order]);

  if (!fulfillment) {
    return (
      <section className="card">
        <h2 className="card__title">Expedição</h2>
        <p className="muted">
          {order.status === "PENDING"
            ? "A produção começa quando o pagamento for aprovado."
            : "Este pedido não tem expedição."}
        </p>
      </section>
    );
  }

  const currentIndex = FULFILLMENT_STEPS.indexOf(fulfillment.status);
  const transitions = TRANSITIONS[fulfillment.status] ?? [];
  const canEdit = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"].includes(order.status);

  async function changeStatus(to: FulfillmentStatus) {
    setStatusError(null);
    const payload: FulfillmentUpdatePayload = { status: to };
    if (note.trim()) payload.note = note.trim();
    if (to === "SHIPPED") {
      const code = normalizeTrackingCode(postTracking);
      if (!TRACKING_CODE_PATTERN.test(code)) {
        setStatusError("Informe o código de rastreio no formato AB123456789BR.");
        return;
      }
      payload.trackingCode = code;
      if (form.serviceCode) payload.serviceCode = form.serviceCode;
    }
    setStatusBusy(to);
    try {
      const updated = await ordersService.updateFulfillment(order.number, payload);
      setNote("");
      onUpdated(updated);
    } catch (error) {
      setStatusError(extractError(error, "Não foi possível mudar o status."));
    } finally {
      setStatusBusy(null);
    }
  }

  async function savePackage(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setSaved(false);
    const f = fulfillment!;
    const weight = numberOrNull(form.weight);
    const length = numberOrNull(form.length);
    const width = numberOrNull(form.width);
    const height = numberOrNull(form.height);
    if ([weight, length, width, height].some((n) => n !== null && (Number.isNaN(n) || n <= 0))) {
      setSaveError("Peso e medidas precisam ser números maiores que zero.");
      return;
    }
    const tracking = normalizeTrackingCode(form.trackingCode);
    if (tracking && !TRACKING_CODE_PATTERN.test(tracking)) {
      setSaveError("Código de rastreio inválido. Formato: AB123456789BR.");
      return;
    }

    // Envia so o que mudou; campo esvaziado vai como null (limpa no backend)
    const payload: FulfillmentUpdatePayload = {};
    if ((form.serviceCode || null) !== f.serviceCode && form.serviceCode) payload.serviceCode = form.serviceCode;
    if (weight !== f.packageWeightGrams) payload.packageWeightGrams = weight === null ? null : Math.round(weight);
    if (length !== f.packageLengthCm) payload.packageLengthCm = length;
    if (width !== f.packageWidthCm) payload.packageWidthCm = width;
    if (height !== f.packageHeightCm) payload.packageHeightCm = height;
    const notes = form.internalNotes.trim();
    if (notes !== (f.internalNotes ?? "")) payload.internalNotes = notes || null;
    if (tracking !== (f.trackingCode ?? "") && tracking) payload.trackingCode = tracking;

    if (Object.keys(payload).length === 0) {
      setSaved(true);
      return;
    }
    setSaving(true);
    try {
      const updated = await ordersService.updateFulfillment(order.number, payload);
      onUpdated(updated);
      setSaved(true);
    } catch (error) {
      setSaveError(extractError(error, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof PackageForm) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: e.target.value }));
  };

  return (
    <section className="card card--fulfillment">
      <div className="card__head">
        <h2 className="card__title">Expedição</h2>
        <Link to={labelsUrl([order.number])} className="btn btn--secondary btn--sm">
          Imprimir etiqueta
        </Link>
      </div>

      <ol className="stepper">
        {FULFILLMENT_STEPS.map((step, index) => {
          const dateKey = STEP_DATE[step];
          const at = dateKey ? (fulfillment[dateKey] as string | null) : null;
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
          return (
            <li key={step} className={`stepper__step is-${state}`}>
              <span className="stepper__dot" aria-hidden="true">
                {index < currentIndex ? "✓" : index + 1}
              </span>
              <span className="stepper__label">{FULFILLMENT_STATUS_LABEL[step]}</span>
              {at && index <= currentIndex && <span className="stepper__date">{formatDateTime(at)}</span>}
            </li>
          );
        })}
      </ol>

      {fulfillment.trackingCode && (
        <p className="tracking">
          Rastreio: <span className="mono strong">{fulfillment.trackingCode}</span>{" "}
          <a href={correiosTrackingUrl(fulfillment.trackingCode)} target="_blank" rel="noopener noreferrer">
            Acompanhar nos Correios ↗
          </a>
        </p>
      )}
      {fulfillment.labelPrintedAt && (
        <p className="muted small">Etiqueta impressa em {formatDateTime(fulfillment.labelPrintedAt)}</p>
      )}

      {canEdit && transitions.length > 0 && (
        <div className="actions-box">
          {fulfillment.status === "PACKED" && (
            <label className="field">
              <span className="field__label">Código de rastreio (obrigatório para postar)</span>
              <input
                className="input mono"
                placeholder="AB123456789BR"
                value={postTracking}
                maxLength={20}
                onChange={(e) => setPostTracking(normalizeTrackingCode(e.target.value))}
              />
            </label>
          )}
          <label className="field">
            <span className="field__label">Nota para o cliente (opcional, aparece no histórico do pedido)</span>
            <textarea
              className="input"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="button-row">
            {transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                className={`btn ${t.back ? "btn--secondary" : "btn--primary"}`}
                disabled={statusBusy !== null}
                onClick={() => void changeStatus(t.to)}
              >
                {statusBusy === t.to ? "Salvando…" : t.label}
              </button>
            ))}
          </div>
          <InlineError message={statusError} />
        </div>
      )}

      <form className="package-form" onSubmit={savePackage}>
        <h3 className="card__subtitle">Pacote</h3>
        <div className="form-grid">
          <label className="field">
            <span className="field__label">Serviço</span>
            <select className="input" value={form.serviceCode} onChange={set("serviceCode")} disabled={!canEdit}>
              <option value="PAC">PAC</option>
              <option value="SEDEX">SEDEX</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Peso (g)</span>
            <input
              className="input"
              inputMode="numeric"
              placeholder={String(order.totalWeightGrams)}
              value={form.weight}
              onChange={set("weight")}
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span className="field__label">Comp. (cm)</span>
            <input className="input" inputMode="decimal" value={form.length} onChange={set("length")} disabled={!canEdit} />
          </label>
          <label className="field">
            <span className="field__label">Larg. (cm)</span>
            <input className="input" inputMode="decimal" value={form.width} onChange={set("width")} disabled={!canEdit} />
          </label>
          <label className="field">
            <span className="field__label">Alt. (cm)</span>
            <input className="input" inputMode="decimal" value={form.height} onChange={set("height")} disabled={!canEdit} />
          </label>
          <label className="field">
            <span className="field__label">Rastreio</span>
            <input
              className="input mono"
              placeholder="AB123456789BR"
              value={form.trackingCode}
              maxLength={20}
              onChange={(e) => {
                setSaved(false);
                setForm((c) => ({ ...c, trackingCode: normalizeTrackingCode(e.target.value) }));
              }}
              disabled={!canEdit}
            />
          </label>
        </div>
        <p className="muted small">
          Peso dos itens: {formatWeight(order.totalWeightGrams)} (usado na etiqueta se o peso do pacote ficar vazio).
        </p>
        <label className="field">
          <span className="field__label">Notas internas (não aparecem para o cliente)</span>
          <textarea
            className="input"
            rows={3}
            maxLength={2000}
            value={form.internalNotes}
            onChange={set("internalNotes")}
            disabled={!canEdit}
          />
        </label>
        <InlineError message={saveError} />
        {canEdit && (
          <div className="button-row">
            <button type="submit" className="btn btn--secondary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar pacote"}
            </button>
            {saved && <span className="saved">Salvo.</span>}
          </div>
        )}
      </form>
    </section>
  );
}
