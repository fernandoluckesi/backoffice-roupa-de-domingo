import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ordersService } from "@/services/orders";
import { EmptyState, ErrorState, Loading } from "@/components/StateViews";
import { AddressLabel } from "./AddressLabel";
import { ContentDeclaration } from "./ContentDeclaration";
import { PackingSlip } from "./PackingSlip";
import "./labels.css";
import type { LabelsResponse, OrderDetail } from "@/types";

type LabelFormat = "thermal" | "a4";

const MAX_ORDERS = 100;
const PREFS_KEY = "rd-backoffice:label-prefs";

interface LabelPrefs {
  format: LabelFormat;
  declaration: boolean;
  packing: boolean;
}

const DEFAULT_PREFS: LabelPrefs = { format: "thermal", declaration: true, packing: true };

/** Preferencia de UI (nao e dado pessoal nem sessao): pode ficar no localStorage. */
function loadPrefs(): LabelPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<LabelPrefs>;
    return {
      format: parsed.format === "a4" ? "a4" : "thermal",
      declaration: parsed.declaration !== false,
      packing: parsed.packing !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: LabelPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* sem storage */
  }
}

/**
 * O POST /labels marca labelPrintedAt: deve sair UMA vez por carregamento.
 * No StrictMode (dev) o efeito roda duas vezes; as duas execucoes compartilham a mesma promessa.
 */
const inflight = new Map<string, Promise<LabelsResponse>>();

function requestLabels(numbers: string[]): Promise<LabelsResponse> {
  const key = numbers.join(",");
  let promise = inflight.get(key);
  if (!promise) {
    promise = ordersService.labels(numbers).finally(() => {
      // Libera depois que o segundo efeito do StrictMode ja pegou a mesma promessa
      window.setTimeout(() => inflight.delete(key), 0);
    });
    inflight.set(key, promise);
  }
  return promise;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Busca o detalhe dos pedidos (variante e texto personalizado do romaneio), 4 por vez. */
async function fetchDetails(numbers: string[], onEach: (detail: OrderDetail) => void): Promise<number> {
  let failures = 0;
  const queue = [...numbers];
  const worker = async () => {
    for (let n = queue.shift(); n; n = queue.shift()) {
      try {
        onEach(await ordersService.get(n));
      } catch {
        failures += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, numbers.length) }, worker));
  return failures;
}

export function LabelsPage() {
  const [params, setParams] = useSearchParams();

  const numbers = useMemo(() => {
    const raw = (params.get("orders") ?? "").split(",").map((n) => n.trim()).filter(Boolean);
    return [...new Set(raw)];
  }, [params]);
  const numbersKey = numbers.join(",");

  const stored = useMemo(loadPrefs, []);
  const format: LabelFormat =
    params.get("format") === "a4" ? "a4" : params.get("format") === "thermal" ? "thermal" : stored.format;
  const declaration = params.has("declaration") ? params.get("declaration") === "1" : stored.declaration;
  const packing = params.has("packing") ? params.get("packing") === "1" : stored.packing;

  function updatePrefs(changes: Partial<LabelPrefs>) {
    const next = { format, declaration, packing, ...changes };
    savePrefs(next);
    const query = new URLSearchParams(params);
    query.set("format", next.format);
    query.set("declaration", next.declaration ? "1" : "0");
    query.set("packing", next.packing ? "1" : "0");
    setParams(query, { replace: true });
  }

  const [data, setData] = useState<LabelsResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (numbers.length === 0 || numbers.length > MAX_ORDERS) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    requestLabels(numbers)
      .then((result) => active && setData(result))
      .catch((err: unknown) => active && setError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // numbersKey representa a lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbersKey, attempt]);

  // Detalhes para o romaneio (so quando ele esta ligado)
  const [details, setDetails] = useState<Record<string, OrderDetail>>({});
  const [detailFailures, setDetailFailures] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(false);
  useEffect(() => {
    if (!packing || !data) return;
    const missing = data.labels.map((l) => l.number).filter((n) => !details[n]);
    if (missing.length === 0) return;
    let active = true;
    setLoadingDetails(true);
    fetchDetails(missing, (detail) => {
      if (active) setDetails((current) => ({ ...current, [detail.number]: detail }));
    })
      .then((failures) => active && setDetailFailures(failures))
      .finally(() => active && setLoadingDetails(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packing, data]);

  const missingNumbers = useMemo(() => {
    if (!data) return [];
    const returned = new Set(data.labels.map((l) => l.number));
    return numbers.filter((n) => !returned.has(n));
  }, [data, numbers]);

  const controls = (
    <div className="labels-controls no-print">
      <div className="labels-controls__row">
        <Link to="/orders" className="btn btn--secondary btn--sm">
          ← Pedidos
        </Link>
        <h1 className="labels-controls__title">
          Etiquetas · {numbers.length} {numbers.length === 1 ? "pedido" : "pedidos"}
        </h1>
        <div className="segmented" role="group" aria-label="Formato">
          <button
            type="button"
            className={`segmented__item ${format === "thermal" ? "is-active" : ""}`}
            aria-pressed={format === "thermal"}
            onClick={() => updatePrefs({ format: "thermal" })}
          >
            Térmica 10×15
          </button>
          <button
            type="button"
            className={`segmented__item ${format === "a4" ? "is-active" : ""}`}
            aria-pressed={format === "a4"}
            onClick={() => updatePrefs({ format: "a4" })}
          >
            A4 (4 por folha)
          </button>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={declaration}
            onChange={(e) => updatePrefs({ declaration: e.target.checked })}
          />
          Declaração de Conteúdo
        </label>
        <label className="check">
          <input type="checkbox" checked={packing} onChange={(e) => updatePrefs({ packing: e.target.checked })} />
          Romaneio
        </label>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => window.print()}
          disabled={!data || data.labels.length === 0}
        >
          Imprimir
        </button>
      </div>
      {format === "thermal" && (declaration || packing) && (
        <p className="labels-controls__hint">
          Etiquetas saem em 10×15 cm; declaração e romaneio, em A4. Se a impressora térmica não aceitar páginas A4,
          imprima as etiquetas primeiro e depois os documentos com as caixas acima marcadas/desmarcadas.
        </p>
      )}
      {data && !data.sender.configured && (
        <div className="alert alert--warning">
          <strong>Endereço do remetente não configurado.</strong> As variáveis de endereço da loja não estão definidas
          no backend, então o bloco REMETENTE e a declaração sairão incompletos.
        </div>
      )}
      {missingNumbers.length > 0 && (
        <div className="alert alert--warning">
          Sem dados de etiqueta para: <span className="mono">{missingNumbers.join(", ")}</span>
        </div>
      )}
      {packing && loadingDetails && <p className="labels-controls__hint">Carregando itens do romaneio…</p>}
      {packing && detailFailures > 0 && (
        <p className="labels-controls__hint">
          {detailFailures} romaneio(s) sem detalhes de variante; usando a descrição da etiqueta.
        </p>
      )}
    </div>
  );

  let body;
  if (numbers.length === 0) {
    body = <EmptyState title="Nenhum pedido selecionado.">Selecione pedidos na lista e clique em “Imprimir etiquetas”.</EmptyState>;
  } else if (numbers.length > MAX_ORDERS) {
    body = <EmptyState title={`No máximo ${MAX_ORDERS} pedidos por vez.`}>Selecione menos pedidos.</EmptyState>;
  } else if (loading && !data) {
    body = <Loading label="Preparando etiquetas…" />;
  } else if (error) {
    body = <ErrorState error={error} onRetry={() => setAttempt((a) => a + 1)} title="Não foi possível gerar as etiquetas." />;
  } else if (!data || data.labels.length === 0) {
    body = <EmptyState title="Nenhuma etiqueta gerada." />;
  } else {
    const { labels, sender } = data;
    body = (
      <div className={`print-area print-area--${format}`}>
        {format === "thermal"
          ? labels.map((label) => (
              <div key={label.number} className="sheet sheet--thermal">
                <AddressLabel label={label} sender={sender} />
              </div>
            ))
          : chunk(labels, 4).map((group, index) => (
              <div key={index} className="sheet sheet--a4 sheet--grid">
                {group.map((label) => (
                  <div key={label.number} className="sheet__cell">
                    <AddressLabel label={label} sender={sender} />
                  </div>
                ))}
              </div>
            ))}
        {labels.map((label) => (
          <Fragment key={`docs-${label.number}`}>
            {declaration && (
              <div className="sheet sheet--a4 sheet--doc">
                <ContentDeclaration label={label} sender={sender} />
              </div>
            )}
            {packing && (
              <div className="sheet sheet--a4 sheet--doc">
                <PackingSlip label={label} detail={details[label.number]} />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="labels-page">
      {controls}
      {body}
    </div>
  );
}
