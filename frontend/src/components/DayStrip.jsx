import { DAYS, todayIndex } from "@/lib/api";

function Ring({ done, total, active }) {
  const pct = total ? done / total : 0;
  const r = 7;
  const c = 2 * Math.PI * r;
  const track = active ? "rgba(255,255,255,0.35)" : "var(--line)";
  const fill = active ? "#fff" : "var(--teal)";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r={r} fill="none" stroke={track} strokeWidth="2.5" />
      {total > 0 && (
        <circle cx="9" cy="9" r={r} fill="none" stroke={fill} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 9 9)" style={{ transition: "stroke-dashoffset 300ms ease" }} />
      )}
    </svg>
  );
}

export function DayStrip({ selected, onSelect, counts }) {
  const today = todayIndex();
  return (
    <div className="grid grid-cols-7 gap-1.5" role="tablist" data-testid="day-strip">
      {DAYS.map((d, i) => {
        const active = i === selected;
        const { done, total } = counts[i];
        return (
          <button key={d} role="tab" aria-selected={active} onClick={() => onSelect(i)} data-testid={`day-pill-${i}`}
            className={`relative flex flex-col items-center gap-1.5 rounded-2xl py-2.5 min-h-[68px] transition-colors duration-150 active:scale-[0.96] ${active ? "bg-[var(--teal)] text-white shadow-[0_6px_16px_-6px_rgba(30,148,96,0.5)]" : "bg-white text-[var(--ink)] border border-[var(--line)]"}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${active ? "" : i === today ? "text-[var(--teal)]" : "text-[var(--ink-2)]"}`}>{d.slice(0, 3)}</span>
            <Ring done={done} total={total} active={active} />
            <span className={`text-[10px] tabular-nums ${active ? "text-white/80" : "text-[var(--ink-3)]"}`}>{total ? `${done}/${total}` : "–"}</span>
            {i === today && !active && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />}
          </button>
        );
      })}
    </div>
  );
}
