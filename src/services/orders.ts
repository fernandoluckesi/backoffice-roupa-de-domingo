import { api } from "./http";
import type {
  FulfillmentUpdatePayload,
  LabelsResponse,
  OrderDetail,
  OrderListItem,
  OrderListQuery,
  OrdersSummary,
  Paginated,
  ProductionList,
  ProductionStage,
  Sender,
} from "@/types";

const enc = encodeURIComponent;

export const ordersService = {
  async summary(): Promise<OrdersSummary> {
    const { data } = await api.get<OrdersSummary>("/admin/orders/summary");
    return data;
  },
  async list(query: OrderListQuery): Promise<Paginated<OrderListItem>> {
    const params: Record<string, string | number> = {};
    if (query.stage && query.stage !== "all") params.stage = query.stage;
    if (query.q) params.q = query.q;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    params.page = query.page ?? 1;
    params.pageSize = query.pageSize ?? 25;
    const { data } = await api.get<Paginated<OrderListItem>>("/admin/orders", { params });
    return data;
  },
  async get(number: string): Promise<OrderDetail> {
    const { data } = await api.get<OrderDetail>(`/admin/orders/${enc(number)}`);
    return data;
  },
  async updateFulfillment(number: string, payload: FulfillmentUpdatePayload): Promise<OrderDetail> {
    const { data } = await api.patch<OrderDetail>(`/admin/orders/${enc(number)}/fulfillment`, payload);
    return data;
  },
  async cancel(number: string): Promise<OrderDetail> {
    const { data } = await api.post<OrderDetail>(`/admin/orders/${enc(number)}/cancel`);
    return data;
  },
  async labels(numbers: string[]): Promise<LabelsResponse> {
    const { data } = await api.post<LabelsResponse>("/admin/orders/labels", { numbers });
    return data;
  },
  async productionList(stage: ProductionStage): Promise<ProductionList> {
    const { data } = await api.get<ProductionList>("/admin/orders/production-list", { params: { stage } });
    return data;
  },
  async sender(): Promise<Sender> {
    const { data } = await api.get<Sender>("/admin/shipping/sender");
    return data;
  },
};
