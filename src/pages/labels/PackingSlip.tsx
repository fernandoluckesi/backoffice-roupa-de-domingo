import { formatDateTime } from "@/utils/format";
import type { OrderDetail, ShippingLabel } from "@/types";

interface SlipLine {
  key: string;
  title: string;
  variant: string | null;
  sku: string;
  customText: string | null;
  quantity: number;
}

function linesFrom(label: ShippingLabel, detail: OrderDetail | undefined): SlipLine[] {
  if (detail) {
    return detail.items.map((item) => ({
      key: item.id,
      title: item.productName,
      variant: item.variantLabel,
      sku: item.sku,
      customText: item.customText,
      quantity: item.quantity,
    }));
  }
  // Sem o detalhe do pedido: usa a descricao que veio com a etiqueta
  return label.items.map((item, index) => ({
    key: `${item.sku}-${index}`,
    title: item.description,
    variant: null,
    sku: item.sku,
    customText: null,
    quantity: item.quantity,
  }));
}

/** Romaneio: conferencia do que vai na caixa (marque cada item ao embalar). */
export function PackingSlip({ label, detail }: { label: ShippingLabel; detail?: OrderDetail }) {
  const lines = linesFrom(label, detail);
  const units = lines.reduce((acc, l) => acc + l.quantity, 0);

  return (
    <article className="packing-slip">
      <header className="packing-slip__header">
        <div>
          <span className="packing-slip__brand">Roupa de Domingo</span>
          <h1>Romaneio do pedido {label.number}</h1>
        </div>
        <div className="packing-slip__meta">
          <span>Pedido feito em {formatDateTime(detail?.createdAt ?? label.createdAt)}</span>
          <span>
            Envio: <strong>{label.serviceCode}</strong>
          </span>
          <span>Para: {label.recipient.name}</span>
        </div>
      </header>

      <table className="packing-slip__table">
        <thead>
          <tr>
            <th className="packing-slip__check-col">OK</th>
            <th>Item</th>
            <th>SKU</th>
            <th className="packing-slip__qty-col">Qtd.</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.key}>
              <td className="center">
                <span className="checkbox-box" />
              </td>
              <td>
                <strong>{line.title}</strong>
                {line.variant && <span className="block">{line.variant}</span>}
                {line.customText && (
                  <span className="block packing-slip__custom">
                    Texto personalizado: <strong>“{line.customText}”</strong>
                  </span>
                )}
              </td>
              <td className="mono">{line.sku}</td>
              <td className="center packing-slip__qty">{line.quantity}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="right">
              Total de peças
            </td>
            <td className="center">
              <strong>{units}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="packing-slip__thanks">
        Obrigado por vestir a Roupa de Domingo. Feito à mão, embalado com carinho e com zero arrependimento. Use sem
        moderação.
      </p>
    </article>
  );
}
