import { Check, Camera, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PhotoImg } from "@/components/PhotoImg";

export function SetDots({ ex, onSet, idPrefix = "exercise" }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" data-testid={`${idPrefix}-sets-${ex.id}`}>
      {Array.from({ length: ex.sets }, (_, i) => {
        const on = i < ex.sets_done;
        return (
          <button key={i} onClick={() => onSet(ex, on && i === ex.sets_done - 1 ? i : i + 1)} aria-pressed={on} aria-label={`Set ${i + 1}`}
            data-testid={`${idPrefix}-set-${ex.id}-${i + 1}`}
            className={`h-8 min-w-8 px-2 rounded-full text-xs font-semibold tabular-nums border transition-colors duration-150 active:scale-95 ${on ? "bg-[var(--ok)] border-[var(--ok)] text-white" : "bg-white border-[var(--line-strong)] text-[var(--ink-2)]"}`}>
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

export function ExerciseCard({ ex, index, onToggle, onSet, onEdit, onDelete, onPhoto }) {
  return (
    <li data-testid={`exercise-card-${ex.id}`} style={{ animationDelay: `${index * 40}ms` }}
      className={`fade-up flex items-start gap-3 rounded-2xl border bg-white p-2.5 pr-1.5 transition-colors duration-200 ${ex.completed ? "border-[var(--ok-line)] bg-[var(--ok-bg)]" : "border-[var(--line)]"}`}>
      {ex.photo_path ? (
        <button onClick={() => onPhoto(ex)} className="shrink-0 rounded-xl overflow-hidden active:opacity-80" data-testid={`exercise-photo-btn-${ex.id}`} aria-label="View photo">
          <PhotoImg path={ex.photo_path} alt={ex.name} className="h-14 w-14 rounded-xl" />
        </button>
      ) : (
        <button onClick={() => onEdit(ex)} className="shrink-0 h-14 w-14 rounded-xl bg-[var(--sunken)] grid place-items-center text-[var(--ink-3)] active:opacity-80" data-testid={`exercise-add-photo-${ex.id}`} aria-label="Add photo">
          <Camera size={20} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-[15px] leading-tight truncate transition-colors ${ex.completed ? "text-[var(--ink-2)] line-through decoration-[var(--ok)]/50" : ""}`} data-testid={`exercise-name-${ex.id}`}>{ex.name}</p>
        <p className="mt-1 text-[13px] text-[var(--ink-2)] tabular-nums" data-testid={`exercise-sets-reps-${ex.id}`}>
          <span className="font-semibold text-[var(--ink)]">{ex.sets_done}/{ex.sets}</span> sets × <span className="font-semibold text-[var(--ink)]">{ex.reps}</span> reps
        </p>
        <SetDots ex={ex} onSet={onSet} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-11 w-8 grid place-items-center text-[var(--ink-3)] rounded-lg active:bg-[var(--sunken)]" data-testid={`exercise-menu-${ex.id}`} aria-label="More">
            <MoreVertical size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(ex)} data-testid={`exercise-edit-${ex.id}`}><Pencil size={14} className="mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(ex)} className="text-[var(--danger)]" data-testid={`exercise-delete-${ex.id}`}><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button onClick={() => onToggle(ex)} style={{ alignSelf: "center" }} aria-pressed={ex.completed} aria-label={ex.completed ? "Mark not done" : "Mark done"} data-testid={`exercise-check-${ex.id}`}
        className="h-12 w-12 shrink-0 grid place-items-center rounded-full">
        <span className={`check-dot h-9 w-9 rounded-full grid place-items-center border-2 ${ex.completed ? "is-on bg-[var(--ok)] border-[var(--ok)] text-white" : "border-[var(--line-strong)] text-transparent bg-white"}`}>
          <Check size={20} strokeWidth={3} />
        </span>
      </button>
    </li>
  );
}
