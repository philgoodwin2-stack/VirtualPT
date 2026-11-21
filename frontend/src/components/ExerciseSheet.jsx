import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DAYS, useApi, compressImage, errorMessage } from "@/lib/api";
import { PhotoImg } from "@/components/PhotoImg";
import { ExerciseLibrary } from "@/components/ExerciseLibrary";

const empty = (day) => ({ day, name: "", sets: "3", reps: "10", photo_path: null });

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-xs text-[var(--danger)]" data-testid="form-error">{error}</span>}
    </label>
  );
}

const inputCls = "w-full h-12 rounded-xl border border-[var(--line)] bg-[var(--subtle)] px-3.5 text-base outline-none focus:border-[var(--teal)] focus:bg-white transition-colors";

export function ExerciseSheet({ open, onOpenChange, editing, defaultDay, onSaved }) {
  const api = useApi();
  const [form, setForm] = useState(empty(defaultDay));
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing, sets: String(editing.sets) } : empty(defaultDay));
      setErrors({});
    }
  }, [open, editing, defaultDay]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const { path } = await api("post", "/photos", fd);
      setForm((f) => ({ ...f, photo_path: path }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = "Give the exercise a name";
    const s = Number(form.sets);
    if (!Number.isInteger(s) || s < 1 || s > 99) er.sets = "1–99";
    if (!String(form.reps).trim()) er.reps = "Required";
    setErrors(er);
    return !Object.keys(er).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = { day: form.day, name: form.name.trim(), sets: Number(form.sets), reps: String(form.reps).trim() };
    try {
      let saved;
      if (editing) {
        const photo = form.photo_path ? { photo_path: form.photo_path } : { remove_photo: !!editing.photo_path };
        saved = await api("patch", `/exercises/${editing.id}`, { ...payload, ...photo });
      } else {
        saved = await api("post", "/exercises", { ...payload, photo_path: form.photo_path });
      }
      onSaved(saved, !!editing);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92dvh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-lg sm:mx-auto" data-testid="exercise-sheet">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">{editing ? "Edit exercise" : "Add exercise"}</SheetTitle>
          <SheetDescription>Name, sets, reps and an optional photo.</SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-4">
          {!editing && <ExerciseLibrary onPick={(p) => { setForm((f) => ({ ...f, ...p })); setErrors({}); }} />}
          <Field label="Exercise" error={errors.name}>
            <input className={inputCls} value={form.name} onChange={set("name")} placeholder="e.g. Goblet squat" maxLength={60} data-testid="exercise-name-input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sets" error={errors.sets}>
              <input className={`${inputCls} tabular-nums`} type="number" inputMode="numeric" min={1} max={99} value={form.sets} onChange={set("sets")} data-testid="exercise-sets-input" />
            </Field>
            <Field label="Reps" error={errors.reps}>
              <input className={`${inputCls} tabular-nums`} value={form.reps} onChange={set("reps")} placeholder="10 or 8-12" maxLength={20} data-testid="exercise-reps-input" />
            </Field>
          </div>
          <Field label="Day">
            <div className="grid grid-cols-7 gap-1.5" data-testid="exercise-day-picker">
              {DAYS.map((d, i) => (
                <button type="button" key={d} onClick={() => setForm((f) => ({ ...f, day: i }))} data-testid={`exercise-day-option-${i}`}
                  className={`h-11 rounded-xl text-xs font-semibold transition-colors ${form.day === i ? "bg-[var(--teal)] text-white" : "bg-[var(--subtle)] text-[var(--ink-2)] border border-[var(--line)]"}`}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Photo">
            {form.photo_path ? (
              <div className="relative w-full">
                <PhotoImg path={form.photo_path} alt="Exercise" className="w-full h-48 rounded-2xl" testId="exercise-photo-preview" />
                <button type="button" onClick={() => setForm((f) => ({ ...f, photo_path: null }))} data-testid="exercise-photo-remove"
                  className="absolute top-2 right-2 h-10 w-10 rounded-full bg-black/60 text-white grid place-items-center" aria-label="Remove photo">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled={uploading} onClick={() => cameraRef.current?.click()} data-testid="exercise-take-photo"
                  className="h-20 rounded-2xl border border-dashed border-[var(--line-strong)] flex flex-col items-center justify-center gap-1 text-sm text-[var(--ink-2)] active:bg-[var(--subtle)] disabled:opacity-60">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />} Take photo
                </button>
                <button type="button" disabled={uploading} onClick={() => galleryRef.current?.click()} data-testid="exercise-upload-photo"
                  className="h-20 rounded-2xl border border-dashed border-[var(--line-strong)] flex flex-col items-center justify-center gap-1 text-sm text-[var(--ink-2)] active:bg-[var(--subtle)] disabled:opacity-60">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />} Upload
                </button>
              </div>
            )}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} data-testid="exercise-camera-input" />
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} data-testid="exercise-file-input" />
          </Field>
          <button onClick={save} disabled={saving || uploading} data-testid="exercise-save-btn"
            className="w-full h-12 rounded-xl bg-[var(--teal)] text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={18} className="animate-spin" />} {editing ? "Save changes" : `Add to ${DAYS[form.day]}`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
