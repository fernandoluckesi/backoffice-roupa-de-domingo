import type {
  FulfillmentStatus,
  OrderStage,
  OrderStatus,
  OrdersSummary,
  PaymentStatus,
  ServiceCode,
  ShippingMethod,
} from "@/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  IN_PRODUCTION: "Em produção",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Estornado",
  FAILED: "Pagamento recusado",
};

export const FULFILLMENT_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  QUEUED: "A produzir",
  IN_PRODUCTION: "Em produção",
  PACKED: "Embalado",
  SHIPPED: "Postado",
  DELIVERED: "Entregue",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  IN_PROCESS: "Em análise",
  REJECTED: "Recusado",
  REFUNDED: "Estornado",
  CANCELLED: "Cancelado",
};

export const RETURN_TYPE_LABEL: Record<"REGRET" | "DEFECT", string> = {
  REGRET: "Arrependimento",
  DEFECT: "Defeito",
};

export const FULFILLMENT_STEPS: FulfillmentStatus[] = ["QUEUED", "IN_PRODUCTION", "PACKED", "SHIPPED", "DELIVERED"];

/** Tom visual do selo: vira a classe CSS badge--<tone>. */
export type Tone = "neutral" | "warning" | "info" | "success" | "danger" | "accent";

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING: "warning",
  PAID: "success",
  IN_PRODUCTION: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
  REFUNDED: "neutral",
  FAILED: "danger",
};

export const FULFILLMENT_STATUS_TONE: Record<FulfillmentStatus, Tone> = {
  QUEUED: "accent",
  IN_PRODUCTION: "info",
  PACKED: "warning",
  SHIPPED: "info",
  DELIVERED: "success",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  IN_PROCESS: "warning",
  REJECTED: "danger",
  REFUNDED: "neutral",
  CANCELLED: "neutral",
};

export const STAGES: { value: OrderStage; label: string }[] = [
  { value: "to_produce", label: "A produzir" },
  { value: "in_production", label: "Em produção" },
  { value: "packed", label: "Embalados" },
  { value: "shipped", label: "Postados" },
  { value: "delivered", label: "Entregues" },
  { value: "awaiting_payment", label: "Aguardando pagamento" },
  { value: "issues", label: "Problemas" },
  { value: "all", label: "Todos" },
];

export function isOrderStage(value: string | null): value is OrderStage {
  return STAGES.some((s) => s.value === value);
}

/**
 * Contagem por etapa a partir do resumo. "issues" e aproximado: soma pedidos
 * cancelados/estornados/recusados com devolucoes abertas (um pedido pode estar nos dois).
 */
export function stageCount(summary: OrdersSummary, stage: OrderStage): number {
  const s = summary.byStatus;
  const f = summary.byFulfillment;
  switch (stage) {
    case "awaiting_payment":
      return s.PENDING ?? 0;
    case "to_produce":
      return f.QUEUED ?? 0;
    case "in_production":
      return f.IN_PRODUCTION ?? 0;
    case "packed":
      return f.PACKED ?? 0;
    case "shipped":
      return f.SHIPPED ?? 0;
    case "delivered":
      return f.DELIVERED ?? 0;
    case "issues":
      return (s.CANCELLED ?? 0) + (s.REFUNDED ?? 0) + (s.FAILED ?? 0) + (summary.openReturns ?? 0);
    case "all":
      return Object.values(s).reduce<number>((acc, n) => acc + (n ?? 0), 0);
  }
}

export function serviceForMethod(method: ShippingMethod): ServiceCode {
  return method === "expresso" ? "SEDEX" : "PAC";
}

export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value;
}
