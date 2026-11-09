import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  /** Altura das barras em px (a 96dpi, ~3.78px por mm) */
  height?: number;
  /** Largura da barra mais fina em px */
  barWidth?: number;
  showText?: boolean;
  fontSize?: number;
  className?: string;
}

/** Codigo de barras Code128 em SVG (nitido na impressao termica). */
export function Barcode({ value, height = 50, barWidth = 2, showText = true, fontSize = 14, className }: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        width: barWidth,
        displayValue: showText,
        fontSize,
        margin: 0,
        textMargin: 2,
        font: "monospace",
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // valor invalido para Code128: deixa o SVG vazio (o texto continua impresso no bloco)
      ref.current.innerHTML = "";
    }
  }, [value, height, barWidth, showText, fontSize]);

  return <svg ref={ref} className={className} role="img" aria-label={`Código de barras ${value}`} />;
}
