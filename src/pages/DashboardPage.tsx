import { Link } from "react-router-dom";
import { ordersService } from "@/services/orders";
import { useAsync } from "@/hooks/useAsync";
import { ErrorState, Loading } from "@/components/StateViews";
import { formatMoney, localDateInputValue } from "@/utils/format";
import { stageCount } from "@/utils/status";
import type { OrderStage, OrdersSummary } from "@/types";

const PIPELINE: { stage: OrderStage; label: string; hint: string }[] = [
  { stage: "to_produce", label: "A produzir", hint: "Pagos, esperando produção" },
  { stage: "in_production", label: "Em produção", hint: "Na bancada" },
  { stage: "packed", label: "Embalados", hint: "Prontos para postar" },
  { stage: "shipped", label: "Postados", hint: "A caminho do cliente" },
  { stage: "delivered", label: "Entregues", hint: "Missão cumprida" },
];

function StatCard({
  to,
  label,
  value,
  hint,
  highlight,
}: {
  to: string;
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Link to={to} className={`stat-card ${highlight ? "stat-card--highlight" : ""}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </Link>
  );
}

function PeriodCard({ title, to, window }: { title: string; to: string; window: OrdersSummary["today"] }) {
  return (
    <Link to={to} className="stat-card stat-card--period">
      <span className="stat-card__label">{title}</span>
      <span className="stat-card__value">{formatMoney(window.paidCents)}</span>
      <span className="stat-card__hint">
        {window.orders} {window.orders === 1 ? "pedido" : "pedidos"} · {window.paidOrders}{" "}
        {window.paidOrders === 1 ? "pago" : "pagos"}
      </span>
    </Link>
  );
}

export function DashboardPage() {
  const { data, error, loading, reload } = useAsync(() => ordersService.summary(), []);

  const today = localDateInputValue();
  const thirtyDaysAgo = localDateInputValue(-29);

  return (
    <div className="page">
      <header className="page__header">
        <h1>Painel</h1>
        <button type="button" className="btn btn--secondary btn--sm" onClick={reload} disabled={loading}>
          Atualizar
        </button>
      </header>

      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data ? (
        <>
          <section className="section">
            <h2 className="section__title">Linha de produção</h2>
            <div className="pipeline">
              {PIPELINE.map((step) => (
                <StatCard
                  key={step.stage}
                  to={`/orders?stage=${step.stage}`}
                  label={step.label}
                  value={stageCount(data, step.stage)}
                  hint={step.hint}
                  highlight={step.stage === "to_produce" && stageCount(data, step.stage) > 0}
                />
              ))}
            </div>
          </section>

          <section className="section">
            <h2 className="section__title">Atenção</h2>
            <div className="card-grid">
              <StatCard
                to="/orders?stage=awaiting_payment"
                label="Aguardando pagamento"
                value={data.byStatus.PENDING ?? 0}
                hint="Pix/boleto ainda não compensados"
              />
              <StatCard
                to="/orders?stage=issues"
                label="Problemas"
                value={stageCount(data, "issues")}
                hint={`${data.byStatus.CANCELLED ?? 0} cancelados · ${data.byStatus.REFUNDED ?? 0} estornados · ${
                  data.byStatus.FAILED ?? 0
                } recusados · ${data.openReturns} devoluções abertas`}
              />
            </div>
          </section>

          <section className="section">
            <h2 className="section__title">Vendas (valor pago)</h2>
            <div className="card-grid">
              <PeriodCard title="Hoje" to={`/orders?stage=all&from=${today}&to=${today}`} window={data.today} />
              <PeriodCard
                title="Últimos 30 dias"
                to={`/orders?stage=all&from=${thirtyDaysAgo}&to=${today}`}
                window={data.last30Days}
              />
            </div>
          </section>
          {error ? <ErrorState error={error} onRetry={reload} title="Falha ao atualizar." /> : null}
        </>
      ) : null}
    </div>
  );
}
