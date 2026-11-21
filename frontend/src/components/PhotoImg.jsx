import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { useApi } from "@/lib/api";

const cache = new Map();

// Fetches a private photo with the session token and shows it as a blob URL.
export function PhotoImg({ path, alt, className, testId }) {
  const api = useApi();
  const [src, setSrc] = useState(() => cache.get(path) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path || cache.has(path)) {
      setSrc(cache.get(path) || null);
      return;
    }
    let alive = true;
    api("get", `/photos/${path}`, undefined, { responseType: "blob" })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        cache.set(path, url);
        if (alive) setSrc(url);
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [path, api]);

  if (!src) {
    return (
      <div className={`${className} grid place-items-center bg-[var(--sunken)] text-[var(--ink-3)] ${failed ? "" : "animate-pulse"}`} data-testid={testId}>
        <ImageIcon size={18} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={`${className} object-cover`} data-testid={testId} />;
}
