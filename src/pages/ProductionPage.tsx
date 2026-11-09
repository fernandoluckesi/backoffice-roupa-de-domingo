import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ordersService } from "@/services/orders";
import { extractError } from "@/services/http";
import { useAsync } from "@/hooks/useAsync";
import { EmptyState, ErrorState, Loading } from "@/components/StateViews";
import { ProductThumb } from "@/components/ProductThumb";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatDateTime, pluralize } from "@/utils/format";
import type { ProductionListItem, ProductionStage } from "@/types";

const STAGE_LABEL: Record<ProductionStage, string> = {
  to_produce: "A produzir",
  in_production: "Em produção",
};

interface ProductGroup {
  productName: string;
  quantity: number;
  items: ProductionListItem[];
}

function groupByProduct(items: ProductionListItem[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const item of items) {
    const group = map.get(item.productName) ?? { productName: item.productName, quantity: 0, items: [] };
    group.quantity += item.quantity;
    group.items.push(item);
    map.set(item.productName, group);
  }
  return [...map.values()].sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
}

interface BulkProgress {
  done: number;
  total: number;
  failures: { number: string; message: string }[];
  finished: boolean;
}

export function ProductionPage() {
  const [params, setParams] = useSearchParams();
  const stage: ProductionStage = params.get("stage") === "in_production" ? "in_production" : "to_produce";
  const { data, error, loading, reload } = useAsync(() => ordersService.productionList(stage), [stage]);
  const groups = useMemo(() => groupByProduct(data?.items ?? []), [data]);
  const totalUnits = useMemo(() => (data?.items ?? []).reduce((acc, i) => acc + i.quantity, 0), [data]);

  const [confirmBulk, setConfirmBulk] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const running = progress !== null && !progress.finished;

  /** PATCH sequencial (um pedido por vez) para nao atropelar o backend nem os e-mails. */
  async function startAll() {
    setConfirmBulk(false);
    const numbers = data?.orders ?? [];
    const state: BulkProgress = { done: 0, total: numbers.length, failures: [], finished: false };
    setProgress({ ...state });
    for (const number of numbers) {
      try {
        await ordersService.updateFulfillment(number, { status: "IN_PRODUCTION" });
      } catch (err) {
        state.failures.push({ number, message: extractError(err) });
      }
      state.done += 1;
      setProgress({ ...state, failures: [...state.failures] });
    }
    setProgress({ ...state, failures: [...state.failures], finished: true });
    reload();
  }

  return (
    <div className="page page--production">
      <header className="page__header">
        <div>
          <h1>Lista de produção</h1>
          {data && (
            <p className="muted">
              {STAGE_LABEL[stage]} · {pluralize(data.orders.length, "pedido", "pedidos")} ·{" "}
              {pluralize(totalUnits, "unidade", "unidades")} · gerada em {formatDateTime(data.generatedAt)}
            </p>
          )}
        </div>
        <div className="page__actions no-print">
          <div className="segmented" role="group" aria-label="Etapa">
            {(Object.keys(STAGE_LABEL) as ProductionStage[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`segmented__item ${stage === s ? "is-active" : ""}`}
                aria-pressed={stage === s}
                disabled={running}
                onClick={() => {
                  setProgress(null);
                  setParams(s === "to_produce" ? {} : { stage: s });
                }}
              >
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--secondary" onClick={reload} disabled={loading || running}>
            Atualizar
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => window.print()}
            disabled={!data || data.items.length === 0}
          >
            Imprimir
          </button>
          {stage === "to_produce" && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!data || data.orders.length === 0 || running || loading}
              onClick={() => setConfirmBulk(true)}
            >
              Iniciar produção de todos
            </button>
          )}
        </div>
      </header>

      {progress && (
        <div
          className={`alert no-print ${
            !progress.finished ? "alert--info" : progress.failures.length ? "alert--warning" : "alert--success"
          }`}
          role="status"
        >
          {!progress.finished ? (
            <>
              Iniciando produção… {progress.done} de {progress.total}
              <progress className="progress" max={progress.total} value={progress.done} />
            </>
          ) : progress.failures.length === 0 ? (
            <>Produção iniciada em {pluralize(progress.total, "pedido", "pedidos")}.</>
          ) : (
            <>
              <strong>
                {progress.total - progress.failures.length} de {progress.total} pedidos foram para produção.{" "}
                {pluralize(progress.failures.length, "falha", "falhas")}:
              </strong>
              <ul className="plain-list">
                {progress.failures.map((f) => (
                  <li key={f.number}>
                    <Link to={`/orders/${encodeURIComponent(f.number)}`} className="mono">
                      {f.number}
                    </Link>{" "}
                    — {f.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {loading && !data ? (
        <Loading label="Montando a lista…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Nada para produzir.">
          {stage === "to_produce" ? "Nenhum pedido pago esperando produção." : "Nenhum pedido em produção agora."}
        </EmptyState>
      ) : (
        <div className="production">
          {groups.map((group) => (
            <section key={group.productName} className="production__group">
              <h2 className="production__title">
                {group.productName} <span className="production__total">{group.quantity} un.</span>
              </h2>
              <table className="table table--production">
                <thead>
                  <tr>
                    <th className="production__img-col">Foto</th>
                    <th>Variante</th>
                    <th className="num">Qtd.</th>
                    <th>Textos personalizados</th>
                    <th>Pedidos</th>
                    <th className="print-only production__check-col">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={`${item.sku}-${item.customTexts.join("|")}`}>
                      <td>
                        <ProductThumb path={item.imageUrl} alt={item.productName} size={48} />
                      </td>
                      <td>
                        <strong>{item.variantLabel}</strong>
                        <span className="block small muted">
                          {[item.size && `Tam. ${item.size}`, item.color, item.model].filter(Boolean).join(" · ")}
                        </span>
                        <span className="block mono small muted">SKU {item.sku}</span>
                      </td>
                      <td className="num production__qty">{item.quantity}</td>
                      <td>
                        {item.customTexts.length === 0 ? (
                          <span className="muted">—</span>
                        ) : (
                          <ul className="custom-texts">
                            {item.customTexts.map((text, i) => (
                              <li key={i} className="custom-text">
                                “{text}”
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <span className="order-chips">
                          {item.orders.map((n) => (
                            <Link key={n} to={`/orders/${encodeURIComponent(n)}`} className="chip mono">
                              {n}
                            </Link>
                          ))}
                        </span>
                      </td>
                      <td className="print-only">
                        <span className="checkbox-box" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmBulk}
        title="Iniciar produção de todos?"
        confirmLabel="Iniciar produção"
        onConfirm={() => void startAll()}
        onCancel={() => setConfirmBulk(false)}
      >
        <p>
          {pluralize(data?.orders.length ?? 0, "pedido vai", "pedidos vão")} de “A produzir” para “Em produção”, um de
          cada vez.
        </p>
      </ConfirmDialog>
    </div>
  );
}
