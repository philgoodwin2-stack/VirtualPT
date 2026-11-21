import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser, useClerk } from "@clerk/react";
import { toast } from "sonner";
import { Dumbbell, LogOut, ArrowRight, CalendarDays, ChevronRight, CircleCheck, Flame, Check } from "lucide-react";
import { DAYS, todayIndex, useApi, errorMessage } from "@/lib/api";
import { GymSilhouettes } from "@/components/GymSilhouettes";
import { SetDots } from "@/components/ExerciseCard";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

function TodayCard({ items }) {
  const today = (items || []).filter((e) => e.day === todayIndex());
  const done = today.filter((e) => e.completed).length;
  const text = items === null ? "Loading your plan…"
    : !today.length ? "Nothing planned today. Rest up or add something."
    : done === today.length ? (today.length === 1 ? "Today's exercise is done. Great work!" : `All ${today.length} exercises done. Great work!`)
    : `${done} of ${today.length} exercises done`;
  return (
    <div className="fade-up rounded-3xl border border-[var(--line)] bg-white p-5" style={{ animationDelay: "120ms" }} data-testid="welcome-today-card">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5"><CalendarDays size={13} /> Today · {DAYS[todayIndex()]}</p>
      <p className="mt-2 text-lg font-semibold" data-testid="welcome-today-summary">{text}</p>
      {today.length > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-[var(--sunken)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--ok)]" style={{ width: `${(done / today.length) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function StreakCard({ streak }) {
  if (!streak) return null;
  const n = streak.streak;
  const text = n ? `${n}-week streak` : "No streak yet";
  const sub = streak.this_week_done ? "This week is complete. Keep it going!"
    : n ? "Finish every exercise this week to keep it alive."
    : "Finish every planned exercise this week to start one.";
  return (
    <div className="fade-up mt-3 rounded-3xl border border-[var(--line)] bg-white p-5 flex items-center gap-4" style={{ animationDelay: "100ms" }} data-testid="welcome-streak-card">
      <span className={`h-12 w-12 shrink-0 rounded-2xl grid place-items-center ${n ? "bg-[var(--teal)] text-white" : "bg-[var(--sunken)] text-[var(--ink-3)]"}`}><Flame size={24} /></span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums" data-testid="welcome-streak-count">{text}</p>
        <p className="text-sm text-[var(--ink-2)]" data-testid="welcome-streak-sub">{sub}{streak.best > n ? ` Best: ${streak.best} weeks.` : ""}</p>
      </div>
    </div>
  );
}

function TodoItem({ ex, onSet }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-t border-[var(--line)] first-of-type:border-t-0" data-testid={`welcome-todo-item-${ex.id}`}>
      <div className="flex-1 min-w-0">
        <Link to={`/week?day=${ex.day}`} className="flex items-center gap-1 min-w-0" data-testid={`welcome-todo-open-${ex.id}`}>
          <span className={`font-medium truncate ${ex.completed ? "line-through text-[var(--ink-2)]" : ""}`}>{ex.name}</span>
          <ChevronRight size={15} className="shrink-0 text-[var(--ink-3)]" />
        </Link>
        <span className="block text-xs text-[var(--ink-2)] tabular-nums">{ex.sets_done}/{ex.sets} sets × {ex.reps} reps</span>
        <SetDots ex={ex} onSet={onSet} idPrefix="welcome" />
      </div>
      <button onClick={() => onSet(ex, ex.completed ? 0 : ex.sets)} aria-pressed={ex.completed} aria-label={ex.completed ? "Mark not done" : "Mark done"}
        data-testid={`welcome-check-${ex.id}`} className="h-12 w-12 -mr-1.5 shrink-0 grid place-items-center self-center">
        <span className={`check-dot h-9 w-9 rounded-full grid place-items-center border-2 ${ex.completed ? "is-on bg-[var(--ok)] border-[var(--ok)] text-white" : "border-[var(--line-strong)] text-transparent bg-white"}`}>
          <Check size={20} strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}

function TodoList({ items, shown, onSet }) {
  if (items === null || !items.length) return null;
  const today = todayIndex();
  const groups = DAYS.map((d, i) => ({ day: i, list: items.filter((e) => e.day === i && shown.has(e.id)) })).filter((g) => g.list.length);
  if (!groups.length) {
    return (
      <div className="fade-up mt-6 rounded-2xl border border-[var(--ok-line)] bg-[var(--ok-bg)] p-4 flex items-center gap-3" data-testid="welcome-all-done">
        <CircleCheck size={20} className="text-[var(--ok)]" />
        <p className="text-sm font-medium">Every exercise this week is complete.</p>
      </div>
    );
  }
  return (
    <section className="fade-up mt-6" style={{ animationDelay: "150ms" }} data-testid="welcome-todo">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-2)] mb-2">Still to do this week</h2>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.day} className="rounded-2xl border border-[var(--line)] bg-white overflow-hidden" data-testid={`welcome-todo-day-${g.day}`}>
            <p className={`px-4 pt-3 pb-1 text-xs font-semibold ${g.day === today ? "text-[var(--teal)]" : "text-[var(--ink-2)]"}`}>
              {DAYS[g.day]}{g.day === today ? " · Today" : ""}
            </p>
            {g.list.map((ex) => <TodoItem key={ex.id} ex={ex} onSet={onSet} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function WelcomePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const api = useApi();
  const [items, setItems] = useState(null);
  const [shown, setShown] = useState(new Set());
  const [streak, setStreak] = useState(null);
  const name = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0].split(/[+._]/)[0] || "there";

  const loadStreak = () => api("get", "/streak").then(setStreak).catch(() => {});
  useEffect(() => {
    api("get", "/exercises").then((xs) => {
      setItems(xs);
      setShown(new Set(xs.filter((e) => !e.completed).map((e) => e.id)));
    }).catch(() => setItems([]));
    loadStreak();
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  const replace = (ex) => setItems((xs) => xs.map((x) => (x.id === ex.id ? ex : x)));
  const setDone = async (ex, setsDone) => {
    replace({ ...ex, sets_done: setsDone, completed: setsDone >= ex.sets });
    if (setsDone > ex.sets_done && navigator.vibrate) navigator.vibrate(20);
    try {
      const saved = await api("patch", `/exercises/${ex.id}`, { sets_done: setsDone });
      replace(saved);
      if (saved.completed !== ex.completed) loadStreak();
    } catch (e) {
      replace(ex);
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="min-h-[100dvh] mx-auto w-full max-w-xl flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(1.5rem+env(safe-area-inset-bottom))]" data-testid="welcome-page">
      <div className="flex items-center gap-2.5 fade-up">
        <span className="h-10 w-10 rounded-xl bg-[var(--teal)] text-white grid place-items-center"><Dumbbell size={20} /></span>
        <span className="text-lg font-semibold tracking-tight">VirtualPT</span>
      </div>
      <div className="mt-12 fade-up" style={{ animationDelay: "60ms" }}>
        <p className="text-[var(--ink-2)]">{greeting()},</p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight capitalize break-words" data-testid="welcome-greeting">{name}</h1>
        <p className="mt-3 text-[var(--ink-2)]">Ready to put in some reps?</p>
      </div>
      <div className="mt-8"><TodayCard items={items} /></div>
      <StreakCard streak={streak} />
      <TodoList items={items} shown={shown} onSet={setDone} />
      <GymSilhouettes className="mt-10 w-full text-[var(--sil)] fade-up" testId="welcome-silhouettes" />
      <div className="mt-auto pt-10 space-y-3 fade-up" style={{ animationDelay: "180ms" }}>
        <Link to="/week" data-testid="welcome-start-btn"
          className="w-full min-h-[52px] rounded-2xl bg-[var(--teal)] text-white font-semibold flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(30,148,96,0.55)] active:scale-[0.98] transition-transform">
          Open my week <ArrowRight size={18} />
        </Link>
        <button onClick={() => signOut({ redirectUrl: "/sign-in" })} data-testid="welcome-logout-btn"
          className="w-full h-12 rounded-2xl border border-[var(--line-strong)] bg-white text-[var(--ink-2)] font-medium flex items-center justify-center gap-2 active:bg-[var(--sunken)]">
          <LogOut size={17} /> Log out
        </button>
      </div>
    </div>
  );
}
