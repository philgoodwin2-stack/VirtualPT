import { useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DAYS } from "@/lib/api";

export function CopyDayDialog({ open, onOpenChange, fromDay, count, onCopy }) {
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPicked([]);
  }, [open]);

  const toggle = (i) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const submit = async () => {
    setBusy(true);
    const ok = await onCopy(picked);
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl" data-testid="copy-day-dialog">
        <DialogTitle>Copy {DAYS[fromDay]}</DialogTitle>
        <DialogDescription>Add {count} exercise{count === 1 ? "" : "s"} to the days you pick. Existing exercises stay.</DialogDescription>
        <div className="grid grid-cols-7 gap-1.5 mt-2" data-testid="copy-day-picker">
          {DAYS.map((d, i) => {
            const on = picked.includes(i);
            return (
              <button key={d} type="button" disabled={i === fromDay} onClick={() => toggle(i)} aria-pressed={on} data-testid={`copy-day-option-${i}`}
                className={`h-12 rounded-xl text-xs font-semibold transition-colors disabled:opacity-30 ${on ? "bg-[var(--teal)] text-white" : "bg-[var(--subtle)] text-[var(--ink-2)] border border-[var(--line)]"}`}>
                {d.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <button onClick={submit} disabled={!picked.length || busy} data-testid="copy-day-confirm-btn"
          className="mt-3 w-full h-12 rounded-xl bg-[var(--teal)] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Copy size={17} />}
          {picked.length ? `Copy to ${picked.length} day${picked.length === 1 ? "" : "s"}` : "Pick days"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
