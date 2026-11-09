import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ordersService } from "@/services/orders";
import { extractError, extractStatus } from "@/services/http";
import { useAsync } from "@/hooks/useAsync";
import { EmptyState, ErrorState, InlineError, Loading } from "@/components/StateViews";
import { OrderStatusBadge, PaymentStatusBadge, Badge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductThumb } from "@/components/ProductThumb";
import { FulfillmentPanel } from "@/components/FulfillmentPanel";
import {
  formatCep,
  formatDateTime,
  formatDocument,
  formatMoney,
  formatPhone,
  maskDocument,
} from "@/utils/format";
import {
  FULFILLMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  RETURN_TYPE_LABEL,
  label,
  serviceForMethod,
} from "@/utils/status";
import type { OrderDetail } from "@/types";

/** Endereco no formato de pacote (o mesmo que vai na etiqueta). */
function shippingBlock(order: OrderDetail): string {
  const lines = [
    order.shippingRecipient,
    `${order.shippingStreet}, ${order.shippingNumber}${order.shippingComplement ? ` - ${order.shippingComplement}` : ""}`,
    order.shippingDistrict,
    `${formatCep(order.shippingZipCode)} - ${order.shippingCity}/${order.shippingState}`,
  ];
  return lines.join("\n");
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  bolbradesco: "Boleto",
  ticket: "Boleto",
  boleto: "Boleto",
  account_money: "Saldo Mercado Pago",
};

function CustomerCard({ order }: { order: OrderDetail }) {
  const [showDocument, setShowDocument] = useState(false);
  return (
    <section className="card">
      <h2 className="card__title">Cliente</h2>
      <dl className="dl">
        <dt>Nome</dt>
        <dd>{order.customerName}</dd>
        <dt>E-mail</dt>
        <dd>
          <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
        </dd>
        <dt>Telefone</dt>
        <dd>{formatPhone(order.customerPhone)}</dd>
        <dt>CPF</dt>
        <dd className="dl__inline">
          <span className="mono">
            {showDocument ? formatDocument(order.customerDocument) : maskDocument(order.customerDocument)}
          </span>
          {order.customerDocument && (
            <button type="button" className="btn btn--link btn--sm" onClick={() => setShowDocument((v) => !v)}>
              {showDocument ? "Ocultar" : "Mostrar"}
            </button>
          )}
        </dd>
      </dl>
      {order.notes && (
        <div className="note">
          <span className="field__label">Observação do cliente no checkout</span>
          <p>{order.notes}</p>
        </div>
      )}
    </section>
  );
}

function AddressCard({ order }: { order: OrderDetail }) {
  const text = shippingBlock(order);
  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">Endereço de entrega</h2>
        <CopyButton text={text} label="Copiar endereço" />
      </div>
      <pre className="address-block">{text}</pre>
      <p className="muted small">
        {serviceForMethod(order.shippingMethod)} ({order.shippingMethod === "expresso" ? "expresso" : "econômico"}) ·
        prazo estimado de {order.estimatedDays} {order.estimatedDays === 1 ? "dia útil" : "dias úteis"}
      </p>
    </section>
  );
}

function ItemsCard({ order }: { order: OrderDetail }) {
  return (
    <section className="card">
      <h2 className="card__title">Itens</h2>
      <ul className="item-list">
        {order.items.map((item) => (
          <li key={item.id} className="item">
            <ProductThumb path={item.imageUrl} alt={item.productName} size={64} />
            <div className="item__info">
              <strong>{item.productName}</strong>
              <span className="muted">{item.variantLabel}</span>
              <span className="item__attrs small">
                {item.size && <span>Tam.: {item.size}</span>}
                {item.color && <span>Cor: {item.color}</span>}
                {item.model && <span>Modelo: {item.model}</span>}
                <span className="mono">SKU {item.sku}</span>
              </span>
              {item.customText && (
                <span className="custom-text">
                  Texto personalizado: <strong>“{item.customText}”</strong>
                </span>
              )}
            </div>
            <div className="item__qty">
              <span className="item__qty-n">{item.quantity}×</span>
              <span className="muted small">{formatMoney(item.unitPriceCents)}</span>
            </div>
            <div className="item__total">{formatMoney(item.totalCents)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TotalsCard({ order }: { order: OrderDetail }) {
  const { payment, invoice } = order;
  return (
    <section className="card">
      <h2 className="card__title">Valores e pagamento</h2>
      <dl className="totals">
        <dt>Subtotal</dt>
        <dd>{formatMoney(order.subtotalCents)}</dd>
        {order.discountCents > 0 && (
          <>
            <dt>
              Desconto{order.coupon ? ` (cupom ${order.coupon.code})` : ""}
              {order.coupon?.description && <span className="muted small block">{order.coupon.description}</span>}
            </dt>
            <dd>− {formatMoney(order.discountCents)}</dd>
          </>
        )}
        {order.discountCents === 0 && order.coupon && (
          <>
            <dt>Cupom</dt>
            <dd>{order.coupon.code}</dd>
          </>
        )}
        <dt>Frete</dt>
        <dd>{order.shippingCents === 0 ? "Grátis" : formatMoney(order.shippingCents)}</dd>
        <dt className="totals__grand">Total</dt>
        <dd className="totals__grand">{formatMoney(order.totalCents)}</dd>
      </dl>

      <h3 className="card__subtitle">Pagamento</h3>
      {payment ? (
        <dl className="dl">
          <dt>Status</dt>
          <dd>
            <PaymentStatusBadge status={payment.status} />
          </dd>
          <dt>Meio</dt>
          <dd>
            {payment.method ? PAYMENT_METHOD_LABEL[payment.method] ?? payment.method : "—"}
            {payment.installments && payment.installments > 1 ? ` em ${payment.installments}x` : ""}
          </dd>
          <dt>Valor</dt>
          <dd>{formatMoney(payment.amountCents)}</dd>
          <dt>Pago em</dt>
          <dd>{formatDateTime(payment.paidAt)}</dd>
          <dt>Provedor</dt>
          <dd>
            {payment.provider}
            {payment.providerPaymentId && <span className="mono small"> · {payment.providerPaymentId}</span>}
          </dd>
        </dl>
      ) : (
        <p className="muted">Nenhum pagamento registrado.</p>
      )}

      <h3 className="card__subtitle">Nota fiscal</h3>
      {invoice ? (
        <dl className="dl">
          <dt>Status</dt>
          <dd>{invoice.status}</dd>
          <dt>Número</dt>
          <dd>
            {invoice.number ?? "—"}
            {invoice.series ? ` (série ${invoice.series})` : ""}
          </dd>
          <dt>Emitida em</dt>
          <dd>{formatDateTime(invoice.issuedAt)}</dd>
          {invoice.accessKey && (
            <>
              <dt>Chave</dt>
              <dd className="mono small break">{invoice.accessKey}</dd>
            </>
          )}
          {invoice.pdfUrl && (
            <>
              <dt>DANFE</dt>
              <dd>
                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                  Abrir PDF ↗
                </a>
              </dd>
            </>
          )}
        </dl>
      ) : (
        <p className="muted">Sem nota fiscal emitida.</p>
      )}
    </section>
  );
}

function TimelineCard({ order }: { order: OrderDetail }) {
  const entries = [...order.timeline].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return (
    <section className="card">
      <h2 className="card__title">Histórico</h2>
      {entries.length === 0 ? (
        <p className="muted">Sem eventos.</p>
      ) : (
        <ol className="timeline">
          {entries.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="timeline__entry">
              <span className="timeline__status">
                {label({ ...FULFILLMENT_STATUS_LABEL, ...ORDER_STATUS_LABEL }, entry.status)}
              </span>
              <span className="timeline__date">{formatDateTime(entry.at)}</span>
              {entry.note && <p className="timeline__note">{entry.note}</p>}
            </li>
          ))}
        </ol>
      )}
      {order.returns.length > 0 && (
        <>
          <h3 className="card__subtitle">Devoluções</h3>
          <ul className="plain-list">
            {order.returns.map((r) => (
              <li key={r.protocol}>
                <span className="mono">{r.protocol}</span> · {RETURN_TYPE_LABEL[r.type] ?? r.type} ·{" "}
                <Badge tone="warning">{r.status}</Badge> · {formatDateTime(r.createdAt)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function OrderDetailPage() {
  const { number = "" } = useParams();
  const { data: order, error, loading, reload, setData } = useAsync(() => ordersService.get(number), [number]);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function cancelOrder() {
    setCancelling(true);
    setCancelError(null);
    try {
      setData(await ordersService.cancel(number));
      setConfirmCancel(false);
    } catch (err) {
      setCancelError(extractError(err, "Não foi possível cancelar o pedido."));
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  }

  if (loading && !order) return <div className="page"><Loading label="Carregando pedido…" /></div>;
  if (error && !order) {
    return (
      <div className="page">
        <Link to="/orders" className="back-link">
          ← Pedidos
        </Link>
        {extractStatus(error) === 404 ? (
          <EmptyState title={`Pedido ${number} não encontrado.`} />
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </div>
    );
  }
  if (!order) return null;

  return (
    <div className="page">
      <Link to="/orders" className="back-link">
        ← Pedidos
      </Link>
      <header className="page__header">
        <div>
          <h1 className="mono">{order.number}</h1>
          <p className="muted">
            Criado em {formatDateTime(order.createdAt)} · atualizado em {formatDateTime(order.updatedAt)}
          </p>
        </div>
        <div className="page__actions">
          <OrderStatusBadge status={order.status} label={order.statusLabel} />
          <button type="button" className="btn btn--secondary btn--sm" onClick={reload} disabled={loading}>
            Atualizar
          </button>
          {order.status === "PENDING" && (
            <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirmCancel(true)}>
              Cancelar pedido
            </button>
          )}
        </div>
      </header>
      <InlineError message={cancelError} />
      {error ? <ErrorState error={error} onRetry={reload} title="Falha ao atualizar." /> : null}

      <div className="detail-grid">
        <div className="detail-grid__main">
          <FulfillmentPanel order={order} onUpdated={setData} />
          <ItemsCard order={order} />
          <TimelineCard order={order} />
        </div>
        <div className="detail-grid__side">
          <AddressCard order={order} />
          <CustomerCard order={order} />
          <TotalsCard order={order} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancelar o pedido ${order.number}?`}
        confirmLabel="Cancelar pedido"
        cancelLabel="Manter pedido"
        danger
        busy={cancelling}
        onConfirm={() => void cancelOrder()}
        onCancel={() => setConfirmCancel(false)}
      >
        <p>O pedido ainda não foi pago. Depois de cancelado, ele não pode ser reaberto.</p>
      </ConfirmDialog>
    </div>
  );
}
