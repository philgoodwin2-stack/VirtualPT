import { useState } from "react";
import { Search, ChevronDown, Library } from "lucide-react";
import { EXERCISE_LIBRARY } from "@/lib/exerciseLibrary";

// Pre-defined exercises; picking one fills in name, sets and reps.
export function ExerciseLibrary({ onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState(EXERCISE_LIBRARY[0].group);
  const term = q.trim().toLowerCase();
  const list = term
    ? EXERCISE_LIBRARY.flatMap((g) => g.items).filter(([n]) => n.toLowerCase().includes(term))
    : EXERCISE_LIBRARY.find((g) => g.group === group).items;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--subtle)]" data-testid="exercise-library">
      <button type="button" onClick={() => setOpen((o) => !o)} data-testid="exercise-library-toggle"
        className="w-full h-12 px-4 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
        <Library size={17} className="text-[var(--teal)]" /> Choose from exercise library
        <ChevronDown size={16} className={`ml-auto text-[var(--ink-3)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" data-testid="exercise-library-search"
              className="w-full h-11 rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-base outline-none focus:border-[var(--teal)]" />
          </div>
          {!term && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" data-testid="exercise-library-groups">
              {EXERCISE_LIBRARY.map((g) => (
                <button type="button" key={g.group} onClick={() => setGroup(g.group)} data-testid={`exercise-library-group-${g.group.toLowerCase()}`}
                  className={`h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${group === g.group ? "bg-[var(--teal)] border-transparent text-white" : "bg-white border-[var(--line)] text-[var(--ink-2)]"}`}>
                  {g.group}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 grid gap-1.5">
            {list.map(([name, sets, reps]) => (
              <button type="button" key={name} onClick={() => { onPick({ name, sets: String(sets), reps }); setOpen(false); setQ(""); }}
                data-testid={`exercise-library-item-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="h-11 px-3 rounded-xl bg-white border border-[var(--line)] flex items-center justify-between text-left active:bg-[var(--sunken)]">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-[var(--ink-2)] tabular-nums">{sets} × {reps}</span>
              </button>
            ))}
            {!list.length && <p className="text-sm text-[var(--ink-2)] px-1 py-2" data-testid="exercise-library-empty">No match. Type your own name below.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
