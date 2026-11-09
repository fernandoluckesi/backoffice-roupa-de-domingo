import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@/types";
import {
  FULFILLMENT_STATUS_LABEL,
  FULFILLMENT_STATUS_TONE,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  type Tone,
} from "@/utils/status";

export function Badge({ tone, children, title }: { tone: Tone; children: string; title?: string }) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status, label }: { status: OrderStatus; label?: string }) {
  return <Badge tone={ORDER_STATUS_TONE[status] ?? "neutral"}>{label || ORDER_STATUS_LABEL[status] || status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS_TONE[status] ?? "neutral"}>{PAYMENT_STATUS_LABEL[status] ?? status}</Badge>;
}

export function FulfillmentStatusBadge({ status }: { status: FulfillmentStatus }) {
  return (
    <Badge tone={FULFILLMENT_STATUS_TONE[status] ?? "neutral"}>{FULFILLMENT_STATUS_LABEL[status] ?? status}</Badge>
  );
}
