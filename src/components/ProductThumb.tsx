import { useState } from "react";
import { storefrontImageUrl } from "@/utils/links";

export function ProductThumb({ path, alt, size = 56 }: { path: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = storefrontImageUrl(path);
  if (!src || failed) {
    return (
      <span className="thumb thumb--empty" style={{ width: size, height: size }} aria-hidden="true">
        sem foto
      </span>
    );
  }
  return (
    <img
      className="thumb"
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
