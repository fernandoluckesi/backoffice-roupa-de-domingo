import { formatCep, formatDocument, formatLongDate, formatMoney, formatWeight } from "@/utils/format";
import type { Sender, ShippingLabel } from "@/types";

/** Linhas minimas da tabela, como no formulario oficial (completa com linhas em branco). */
const MIN_ROWS = 8;

function PartyBox({
  title,
  name,
  address,
  cityState,
  zipCode,
  document,
}: {
  title: string;
  name: string;
  address: string;
  cityState: string;
  zipCode: string;
  document: string | null;
}) {
  return (
    <section className="declaration__party">
      <h2 className="declaration__party-title">{title}</h2>
      <dl>
        <dt>NOME:</dt>
        <dd>{name || " "}</dd>
        <dt>ENDEREÇO:</dt>
        <dd>{address || " "}</dd>
        <dt>CIDADE/UF:</dt>
        <dd>{cityState || " "}</dd>
        <dt>CEP:</dt>
        <dd>{zipCode ? formatCep(zipCode) : " "}</dd>
        <dt>CPF/CNPJ:</dt>
        <dd>{document ? formatDocument(document) : " "}</dd>
      </dl>
    </section>
  );
}

function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(", ");
}

/** Declaracao de Conteudo (modelo dos Correios), uma folha A4 por pedido. */
export function ContentDeclaration({ label, sender }: { label: ShippingLabel; sender: Sender }) {
  const r = label.recipient;
  const totalQty = label.items.reduce((acc, i) => acc + i.quantity, 0);
  const blankRows = Math.max(0, MIN_ROWS - label.items.length);
  const place = sender.city ? `${sender.city}/${sender.state}` : "______________________";

  return (
    <article className="declaration">
      <header className="declaration__header">
        <h1>DECLARAÇÃO DE CONTEÚDO</h1>
        <span className="declaration__ref">
          Pedido {label.number} · {label.serviceCode}
          {label.trackingCode ? ` · ${label.trackingCode}` : ""}
        </span>
      </header>

      <div className="declaration__parties">
        <PartyBox
          title="REMETENTE"
          name={sender.name}
          address={joinAddress([
            sender.street && `${sender.street}${sender.number ? `, ${sender.number}` : ""}`,
            sender.complement,
            sender.district,
          ])}
          cityState={sender.city ? `${sender.city}/${sender.state}` : ""}
          zipCode={sender.zipCode}
          document={sender.document}
        />
        <PartyBox
          title="DESTINATÁRIO"
          name={r.name}
          address={joinAddress([`${r.street}, ${r.number}`, r.complement, r.district])}
          cityState={`${r.city}/${r.state}`}
          zipCode={r.zipCode}
          document={r.document}
        />
      </div>

      <section className="declaration__goods">
        <h2 className="declaration__section-title">IDENTIFICAÇÃO DOS BENS</h2>
        <table className="declaration__table">
          <thead>
            <tr>
              <th className="declaration__col-n">ITEM</th>
              <th>CONTEÚDO</th>
              <th className="declaration__col-q">QUANT.</th>
              <th className="declaration__col-v">VALOR</th>
            </tr>
          </thead>
          <tbody>
            {label.items.map((item, index) => (
              <tr key={`${item.sku}-${index}`}>
                <td className="center">{index + 1}</td>
                <td>{item.description}</td>
                <td className="center">{item.quantity}</td>
                <td className="right">{formatMoney(item.totalCents)}</td>
              </tr>
            ))}
            {Array.from({ length: blankRows }, (_, i) => (
              <tr key={`blank-${i}`} className="declaration__blank">
                <td className="center">{label.items.length + i + 1}</td>
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="right">
                <strong>TOTAIS</strong>
              </td>
              <td className="center">
                <strong>{totalQty}</strong>
              </td>
              <td className="right">
                <strong>{formatMoney(label.declaredValueCents)}</strong>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="right">
                <strong>PESO TOTAL (kg)</strong>
              </td>
              <td colSpan={2} className="center">
                <strong>{formatWeight(label.weightGrams)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="declaration__statement">
        <h2 className="declaration__section-title">DECLARAÇÃO</h2>
        <p>
          Declaro, sob as penas da lei, que não sou contribuinte do ICMS em relação a esta remessa ou, sendo, que não
          estou obrigado à emissão de nota fiscal para ela, e que o conteúdo deste volume está descrito acima de forma
          verdadeira e completa. Declaro ainda que este objeto não contém nenhum item perigoso, proibido ou restrito pela
          regulamentação postal, assumindo integral responsabilidade pelas informações aqui prestadas.
        </p>
        <div className="declaration__sign">
          <span>
            {place}, {formatLongDate(new Date())}
          </span>
          <span className="declaration__signature">Assinatura do Declarante/Remetente</span>
        </div>
      </section>

      <section className="declaration__note">
        <h2 className="declaration__section-title">OBSERVAÇÃO</h2>
        <p>
          Esta declaração substitui a nota fiscal somente quando o remetente não estiver obrigado a emiti-la. Constitui
          crime contra a ordem tributária suprimir ou reduzir tributo prestando declaração falsa às autoridades
          fazendárias (Lei 8.137/1990, art. 1º, I).
        </p>
      </section>
    </article>
  );
}
