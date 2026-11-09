export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "FAILED";

export type FulfillmentStatus = "QUEUED" | "IN_PRODUCTION" | "PACKED" | "SHIPPED" | "DELIVERED";

export type PaymentStatus = "PENDING" | "APPROVED" | "IN_PROCESS" | "REJECTED" | "REFUNDED" | "CANCELLED";

export type ServiceCode = "PAC" | "SEDEX";

export type ShippingMethod = "economico" | "expresso";

export type OrderStage =
  | "awaiting_payment"
  | "to_produce"
  | "in_production"
  | "packed"
  | "shipped"
  | "delivered"
  | "issues"
  | "all";

export type ProductionStage = "to_produce" | "in_production";

export interface OrdersSummaryWindow {
  orders: number;
  paidOrders: number;
  paidCents: number;
}

export interface OrdersSummary {
  byStatus: Record<OrderStatus, number>;
  byFulfillment: Record<FulfillmentStatus, number>;
  openReturns: number;
  today: OrdersSummaryWindow;
  last30Days: OrdersSummaryWindow;
}

export interface OrderListQuery {
  stage?: OrderStage;
  q?: string;
  /** ISO (instante) */
  from?: string;
  /** ISO (instante) */
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderListItem {
  number: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string;
  customerName: string;
  shippingCity: string;
  shippingState: string;
  shippingMethod: ShippingMethod;
  totalCents: number;
  units: number;
  payment: { status: PaymentStatus; method: string | null; paidAt: string | null } | null;
  fulfillment: {
    status: FulfillmentStatus;
    serviceCode: ServiceCode | null;
    trackingCode: string | null;
    labelPrintedAt: string | null;
  } | null;
}

export interface OrderTimelineEntry {
  status: string;
  at: string;
  note: string | null;
}

export interface OrderItem {
  id: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  imageUrl: string | null;
  customText: string | null;
  size: string | null;
  color: string | null;
  model: string | null;
  weightGrams: number | null;
}

export interface OrderPayment {
  provider: string;
  status: PaymentStatus;
  method: string | null;
  installments: number | null;
  amountCents: number;
  providerPaymentId: string | null;
  paidAt: string | null;
}

export interface OrderFulfillment {
  status: FulfillmentStatus;
  carrier: string;
  serviceCode: ServiceCode | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  packageWeightGrams: number | null;
  packageLengthCm: number | null;
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  internalNotes: string | null;
  labelPrintedAt: string | null;
  productionStartedAt: string | null;
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderInvoice {
  status: string;
  number: string | null;
  series: string | null;
  accessKey: string | null;
  pdfUrl: string | null;
  issuedAt: string | null;
}

export interface OrderReturn {
  protocol: string;
  type: "REGRET" | "DEFECT";
  status: string;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  number: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  /** CPF completo (somente digitos) */
  customerDocument: string | null;
  shippingRecipient: string;
  /** 8 digitos */
  shippingZipCode: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingComplement: string | null;
  shippingDistrict: string;
  shippingCity: string;
  shippingState: string;
  shippingMethod: ShippingMethod;
  estimatedDays: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  coupon: { code: string; description: string } | null;
  notes: string | null;
  timeline: OrderTimelineEntry[];
  totalWeightGrams: number;
  items: OrderItem[];
  payment: OrderPayment | null;
  fulfillment: OrderFulfillment | null;
  invoice: OrderInvoice | null;
  returns: OrderReturn[];
}

export interface FulfillmentUpdatePayload {
  status?: FulfillmentStatus;
  trackingCode?: string | null;
  serviceCode?: ServiceCode | null;
  packageWeightGrams?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  internalNotes?: string | null;
  /** Texto anexado a linha do tempo (visivel ao cliente) quando o status muda */
  note?: string;
}

export interface ProductionListItem {
  sku: string;
  productName: string;
  variantLabel: string;
  size: string | null;
  color: string | null;
  model: string | null;
  imageUrl: string | null;
  quantity: number;
  customTexts: string[];
  orders: string[];
}

export interface ProductionList {
  generatedAt: string;
  orders: string[];
  items: ProductionListItem[];
}
