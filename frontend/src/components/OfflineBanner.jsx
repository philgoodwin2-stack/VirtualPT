import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div data-testid="offline-banner" className="fixed inset-x-0 top-0 z-50 bg-[var(--warn-bg)] border-b border-[var(--warn)] pt-[env(safe-area-inset-top)] text-center text-sm text-[var(--ink)] py-1.5 flex items-center justify-center gap-2">
      <WifiOff size={14} /> You're offline. Changes need a connection.
    </div>
  );
}
