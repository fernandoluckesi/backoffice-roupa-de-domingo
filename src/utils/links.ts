const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5273").replace(/\/+$/, "");

/** Imagens de produto sao caminhos relativos da LOJA (/products/x.jpg), nao do backoffice. */
export function storefrontImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${STOREFRONT_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function correiosTrackingUrl(code: string): string {
  return `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(code)}`;
}

/** 2 letras + 9 digitos + 2 letras (ex.: AB123456789BR) */
export const TRACKING_CODE_PATTERN = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

export function normalizeTrackingCode(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** Somente numeros de pedido vao na URL (nunca dados pessoais). */
export function labelsUrl(numbers: string[]): string {
  return `/labels?orders=${numbers.map(encodeURIComponent).join(",")}`;
}
