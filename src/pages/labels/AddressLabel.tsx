import { Barcode } from "@/components/Barcode";
import { formatCep, formatPhone, formatWeight, onlyDigits } from "@/utils/format";
import type { Sender, ShippingLabel } from "@/types";

/** Etiqueta de endereco 10x15 cm, inspirada no leiaute dos Correios. */
export function AddressLabel({ label, sender }: { label: ShippingLabel; sender: Sender }) {
  const r = label.recipient;
  const cepDigits = onlyDigits(r.zipCode).padStart(8, "0").slice(-8);
  const senderCep = onlyDigits(sender.zipCode);

  return (
    <article className="address-label">
      <header className="address-label__top">
        <span className={`address-label__service address-label__service--${label.serviceCode.toLowerCase()}`}>
          {label.serviceCode}
        </span>
        <span className="address-label__meta">
          <span>
            Pedido <strong>{label.number}</strong>
          </span>
          <span>Peso {formatWeight(label.weightGrams)}</span>
          {label.dimensionsCm && (
            <span>
              {label.dimensionsCm.length}×{label.dimensionsCm.width}×{label.dimensionsCm.height} cm
            </span>
          )}
          {label.invoiceNumber && <span>NF {label.invoiceNumber}</span>}
        </span>
      </header>

      {label.trackingCode ? (
        <div className="address-label__tracking">
          <Barcode value={label.trackingCode} height={56} barWidth={2} fontSize={16} className="barcode" />
        </div>
      ) : (
        <div className="address-label__tracking address-label__tracking--empty">
          Código de rastreio: ____________________
        </div>
      )}

      <section className="address-label__recipient">
        <span className="address-label__caption">DESTINATÁRIO</span>
        <p className="address-label__name">{r.name}</p>
        <p>
          {r.street}, {r.number}
        </p>
        {r.complement && <p>{r.complement}</p>}
        <p>{r.district}</p>
        <p className="address-label__city">
          <strong>{formatCep(r.zipCode)}</strong> {r.city}/{r.state}
        </p>
        {r.phone && <p className="address-label__small">Tel. {formatPhone(r.phone)}</p>}
        <div className="address-label__cep-barcode">
          <Barcode value={cepDigits} height={36} barWidth={2} showText={false} className="barcode" />
        </div>
      </section>

      <section className="address-label__sender">
        <span className="address-label__caption">REMETENTE</span>
        <p>
          <strong>{sender.name || "—"}</strong>
        </p>
        <p>
          {sender.street}
          {sender.number ? `, ${sender.number}` : ""}
          {sender.complement ? ` - ${sender.complement}` : ""}
          {sender.district ? ` - ${sender.district}` : ""}
        </p>
        <p>
          {senderCep ? formatCep(senderCep) : ""} {sender.city}
          {sender.state ? `/${sender.state}` : ""}
        </p>
      </section>
    </article>
  );
}
