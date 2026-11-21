import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { Plus, RotateCcw, Dumbbell, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { DAYS, todayIndex, useApi, errorMessage } from "@/lib/api";
import { DayStrip } from "@/components/DayStrip";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseSheet } from "@/components/ExerciseSheet";
import { PhotoViewer, ResetDialog, DeleteDialog } from "@/components/WeekDialogs";
import { GymSilhouettes } from "@/components/GymSilhouettes";
import { IosInstallHint } from "@/components/IosInstallHint";
import { CopyDayDialog } from "@/components/CopyDayDialog";

function EmptyDay({ day, onAdd }) {
  return (
    <div className="fade-up flex flex-col items-center text-center py-14 px-6" data-testid="empty-day">
      <GymSilhouettes className="w-64 max-w-full text-[var(--sil)] mb-6" testId="empty-day-silhouettes" />
      <p className="font-semibold">Nothing planned for {DAYS[day]}</p>
      <p className="text-sm text-[var(--ink-2)] mt-1 max-w-[16rem]">Add an exercise, or enjoy a rest day.</p>
      <button onClick={onAdd} className="mt-5 h-11 px-5 rounded-xl border border-[var(--teal)] text-[var(--teal)] font-semibold active:scale-[0.98]" data-testid="empty-day-add-btn">
        Add to {DAYS[day]}
      </button>
    </div>
  );
}

export default function WeekPage() {
  const api = useApi();
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [params] = useSearchParams();
  const [day, setDay] = useState(() => {
    const d = Number(params.get("day"));
    return params.has("day") && Number.isInteger(d) && d >= 0 && d <= 6 ? d : todayIndex();
  });
  const [sheet, setSheet] = useState({ open: false, editing: null });
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const load = () => {
    setLoadError(false);
    api("get", "/exercises").then(setItems).catch(() => setLoadError(true));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => DAYS.map((_, i) => {
    const list = (items || []).filter((e) => e.day === i);
    return { total: list.length, done: list.filter((e) => e.completed).length };
  }), [items]);
  const dayItems = (items || []).filter((e) => e.day === day);
  const { done, total } = counts[day];
  const anyDone = (items || []).some((e) => e.completed);

  const replace = (ex) => setItems((xs) => xs.map((x) => (x.id === ex.id ? ex : x)));

  const setDone = async (ex, setsDone) => {
    replace({ ...ex, sets_done: setsDone, completed: setsDone >= ex.sets });
    if (setsDone > ex.sets_done && navigator.vibrate) navigator.vibrate(20);
    try {
      replace(await api("patch", `/exercises/${ex.id}`, { sets_done: setsDone }));
    } catch (e) {
      replace(ex);
      toast.error(errorMessage(e));
    }
  };
  const toggle = (ex) => setDone(ex, ex.completed ? 0 : ex.sets);

  const onSaved = (ex, wasEdit) => {
    setItems((xs) => (wasEdit ? xs.map((x) => (x.id === ex.id ? ex : x)) : [...xs, ex]));
    setDay(ex.day);
    toast.success(wasEdit ? "Exercise updated" : `Added to ${DAYS[ex.day]}`);
  };

  const confirmDelete = async () => {
    const ex = deleting;
    setDeleting(null);
    try {
      await api("delete", `/exercises/${ex.id}`);
      setItems((xs) => xs.filter((x) => x.id !== ex.id));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const copyDay = async (toDays) => {
    try {
      const created = await api("post", "/exercises/copy", { from_day: day, to_days: toDays });
      setItems((xs) => [...xs, ...created]);
      toast.success(`Copied to ${toDays.sort().map((d) => DAYS[d].slice(0, 3)).join(", ")}`);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  const confirmReset = async () => {
    try {
      await api("post", "/exercises/reset");
      setItems((xs) => xs.map((x) => ({ ...x, completed: false, sets_done: 0 })));
      toast.success("All checks cleared");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="min-h-[100dvh] mx-auto w-full max-w-xl" data-testid="week-page">
      <header className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b border-[var(--line)]/60">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-2.5" data-testid="week-home-link" aria-label="Back to welcome">
            <span className="h-9 w-9 rounded-xl bg-[var(--teal)] text-white grid place-items-center"><Dumbbell size={18} /></span>
            <h1 className="text-xl font-semibold tracking-tight">VirtualPT</h1>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={() => setResetOpen(true)} disabled={!anyDone} data-testid="reset-week-btn"
              className="h-10 px-3 rounded-xl text-sm font-medium text-[var(--ink-2)] flex items-center gap-1.5 active:bg-[var(--sunken)] disabled:opacity-40">
              <RotateCcw size={15} /> Clear week
            </button>
            <div className="h-10 w-10 grid place-items-center" data-testid="user-button"><UserButton /></div>
          </div>
        </div>
        <DayStrip selected={day} onSelect={setDay} counts={counts} />
      </header>

      <main className="px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <IosInstallHint />
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--teal)]">{day === todayIndex() ? "Today" : "Plan"}</p>
            <h2 className="text-2xl font-semibold tracking-tight" data-testid="selected-day-title">{DAYS[day]}</h2>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-[var(--ink-2)]" data-testid="day-progress-text"><b className="text-[var(--ink)]">{done}</b> of {total} done</span>
              <button onClick={() => setCopyOpen(true)} data-testid="copy-day-btn"
                className="h-9 px-3 rounded-xl border border-[var(--line)] bg-white text-sm font-medium text-[var(--ink-2)] flex items-center gap-1.5 active:bg-[var(--sunken)]">
                <Copy size={14} /> Copy
              </button>
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="h-1.5 rounded-full bg-[var(--sunken)] overflow-hidden mb-5" data-testid="day-progress-bar">
            <div className="h-full rounded-full bg-[var(--ok)] transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        )}

        {loadError ? (
          <div className="text-center py-14" data-testid="load-error">
            <p className="text-[var(--ink-2)] mb-4">Couldn't load your exercises.</p>
            <button onClick={load} className="h-11 px-5 rounded-xl border border-[var(--line-strong)] inline-flex items-center gap-2" data-testid="retry-load-btn"><RefreshCw size={16} /> Try again</button>
          </div>
        ) : items === null ? (
          <div className="space-y-2.5" data-testid="loading-skeleton">{[0, 1, 2].map((i) => <div key={i} className="h-[78px] rounded-2xl bg-[var(--sunken)] animate-pulse" />)}</div>
        ) : dayItems.length === 0 ? (
          <EmptyDay day={day} onAdd={() => setSheet({ open: true, editing: null })} />
        ) : (
          <ul key={day} className="space-y-2.5" data-testid="exercise-list">
            {dayItems.map((ex, i) => (
              <ExerciseCard key={ex.id} ex={ex} index={i} onToggle={toggle} onSet={setDone} onEdit={(e) => setSheet({ open: true, editing: e })} onDelete={setDeleting} onPhoto={setViewing} />
            ))}
          </ul>
        )}
        {dayItems.length > 0 && <GymSilhouettes className="mt-12 w-full text-[var(--sil-soft)]" testId="footer-silhouettes" />}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <button onClick={() => setSheet({ open: true, editing: null })} data-testid="add-exercise-btn"
          className="mx-auto max-w-xl w-full h-13 min-h-[52px] rounded-2xl bg-[var(--teal)] text-white font-semibold flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(30,148,96,0.55)] active:scale-[0.98] transition-transform">
          <Plus size={20} /> Add exercise
        </button>
      </div>

      <ExerciseSheet open={sheet.open} editing={sheet.editing} defaultDay={day} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} onSaved={onSaved} />
      <PhotoViewer ex={viewing} onClose={() => setViewing(null)} />
      <DeleteDialog ex={deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} />
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} onConfirm={confirmReset} />
      <CopyDayDialog open={copyOpen} onOpenChange={setCopyOpen} fromDay={day} count={total} onCopy={copyDay} />
    </div>
  );
}
