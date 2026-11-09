import type { ServiceCode } from "./order";

export interface Sender {
  name: string;
  document: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  /** false = variaveis de endereco da loja nao configuradas no backend */
  configured: boolean;
}

export interface LabelRecipient {
  name: string;
  phone: string | null;
  document: string | null;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface LabelItem {
  description: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface ShippingLabel {
  number: string;
  createdAt: string;
  serviceCode: ServiceCode;
  trackingCode: string | null;
  recipient: LabelRecipient;
  weightGrams: number;
  dimensionsCm: { length: number; width: number; height: number } | null;
  declaredValueCents: number;
  invoiceNumber: string | null;
  items: LabelItem[];
}

export interface LabelsResponse {
  sender: Sender;
  labels: ShippingLabel[];
}
