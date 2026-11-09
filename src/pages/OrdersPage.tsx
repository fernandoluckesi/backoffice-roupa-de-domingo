import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ordersService } from "@/services/orders";
import { useAsync } from "@/hooks/useAsync";
import { EmptyState, ErrorState, Loading } from "@/components/StateViews";
import { FulfillmentStatusBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { ScrollTabs } from "@/components/ScrollTabs";
import { dateInputToIso, formatDateTime, formatMoney } from "@/utils/format";
import { isOrderStage, serviceForMethod, stageCount, STAGES } from "@/utils/status";
import { labelsUrl } from "@/utils/links";
import type { OrderStage } from "@/types";

const PAGE_SIZE = 25;
const DEFAULT_STAGE: OrderStage = "to_produce";

export function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const stageParam = params.get("stage");
  const stage: OrderStage = isOrderStage(stageParam) ? stageParam : DEFAULT_STAGE;
  const q = params.get("q") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  /** Atualiza a query string (filtros vivem na URL). Mudar filtro volta para a pagina 1. */
  function updateParams(changes: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    setParams(next);
  }

  const summary = useAsync(() => ordersService.summary(), []);
  const list = useAsync(
    () =>
      ordersService.list({
        stage,
        q: q || undefined,
        from: dateInputToIso(from),
        to: dateInputToIso(to, true),
        page,
        pageSize: PAGE_SIZE,
      }),
    [stage, q, from, to, page],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => setSelected(new Set()), [list.data]);

  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const allSelected = items.length > 0 && items.every((o) => selected.has(o.number));

  function toggle(number: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((o) => o.number)));
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    updateParams({ q: search.trim() || null });
  }

  const hasFilters = Boolean(q || from || to);

  return (
    <div className="page">
      <header className="page__header">
        <h1>Pedidos</h1>
        <div className="page__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={selected.size === 0}
            onClick={() => navigate(labelsUrl([...selected]))}
          >
            Imprimir etiquetas{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </header>

      <ScrollTabs label="Etapas" activeKey={stage}>
        {STAGES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={stage === s.value}
            className={`tab ${stage === s.value ? "is-active" : ""}`}
            onClick={() => updateParams({ stage: s.value })}
          >
            {s.label}
            {summary.data && <span className="tab__count">{stageCount(summary.data, s.value)}</span>}
          </button>
        ))}
      </ScrollTabs>

      <form className="filters" onSubmit={handleSearch} role="search">
        <label className="field field--grow">
          <span className="field__label">Buscar</span>
          <input
            className="input"
            type="search"
            placeholder="Número do pedido, nome ou e-mail do cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">De</span>
          <input
            className="input"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => updateParams({ from: e.target.value || null })}
          />
        </label>
        <label className="field">
          <span className="field__label">Até</span>
          <input
            className="input"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => updateParams({ to: e.target.value || null })}
          />
        </label>
        <button type="submit" className="btn btn--secondary">
          Buscar
        </button>
        {hasFilters && (
          <button
            type="button"
            className="btn btn--link"
            onClick={() => {
              setSearch("");
              updateParams({ q: null, from: null, to: null });
            }}
          >
            Limpar filtros
          </button>
        )}
      </form>

      {list.loading && !list.data ? (
        <Loading label="Carregando pedidos…" />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data || items.length === 0 ? (
        <EmptyState title="Nenhum pedido por aqui.">
          {hasFilters ? "Tente outros filtros." : "Nada nesta etapa no momento."}
        </EmptyState>
      ) : (
        <>
          <div className={`table-wrap ${list.loading ? "is-refreshing" : ""}`}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table__check">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos desta página"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Pedido</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Cidade/UF</th>
                  <th className="num">Un.</th>
                  <th className="num">Total</th>
                  <th>Pagamento</th>
                  <th>Expedição</th>
                  <th>Serviço</th>
                  <th>Rastreio</th>
                  <th title="Etiqueta impressa">Etiq.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((order) => {
                  const service = order.fulfillment?.serviceCode;
                  return (
                    <tr key={order.number} className={selected.has(order.number) ? "is-selected" : ""}>
                      <td className="table__check">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar pedido ${order.number}`}
                          checked={selected.has(order.number)}
                          onChange={() => toggle(order.number)}
                        />
                      </td>
                      <td>
                        <Link to={`/orders/${encodeURIComponent(order.number)}`} className="mono strong">
                          {order.number}
                        </Link>
                      </td>
                      <td className="nowrap">{formatDateTime(order.createdAt)}</td>
                      <td>{order.customerName}</td>
                      <td className="nowrap">
                        {order.shippingCity}/{order.shippingState}
                      </td>
                      <td className="num">{order.units}</td>
                      <td className="num nowrap">{formatMoney(order.totalCents)}</td>
                      <td>
                        {order.payment ? (
                          <PaymentStatusBadge status={order.payment.status} />
                        ) : (
                          <OrderStatusBadge status={order.status} label={order.statusLabel} />
                        )}
                      </td>
                      <td>
                        {order.fulfillment ? (
                          <FulfillmentStatusBadge status={order.fulfillment.status} />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {service ? (
                          <span className="strong">{service}</span>
                        ) : (
                          <span className="muted" title="Escolhido no checkout">
                            {serviceForMethod(order.shippingMethod)}
                          </span>
                        )}
                      </td>
                      <td className="mono small">{order.fulfillment?.trackingCode ?? <span className="muted">—</span>}</td>
                      <td>
                        {order.fulfillment?.labelPrintedAt ? (
                          <span
                            className="printed"
                            title={`Etiqueta impressa em ${formatDateTime(order.fulfillment.labelPrintedAt)}`}
                          >
                            ✓
                          </span>
                        ) : (
                          <span className="muted" title="Etiqueta ainda não impressa">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            total={list.data.total}
            onChange={(p) => updateParams({ page: p > 1 ? String(p) : null }, false)}
          />
        </>
      )}
    </div>
  );
}
