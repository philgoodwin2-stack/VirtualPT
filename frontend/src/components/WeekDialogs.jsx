import { X, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PhotoImg } from "@/components/PhotoImg";

export function PhotoViewer({ ex, onClose }) {
  return (
    <Dialog open={!!ex} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 bg-black border-0 overflow-hidden max-w-[94vw] sm:max-w-lg rounded-2xl [&>button]:hidden" data-testid="photo-viewer">
        <DialogTitle className="sr-only">{ex?.name}</DialogTitle>
        {ex && <PhotoImg path={ex.photo_path} alt={ex.name} className="w-full max-h-[75dvh] !object-contain" testId="photo-viewer-img" />}
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <div>
            <p className="font-semibold">{ex?.name}</p>
            <p className="text-sm text-white/70 tabular-nums">{ex?.sets} sets × {ex?.reps} reps</p>
          </div>
          <button onClick={onClose} className="h-11 w-11 grid place-items-center rounded-full bg-white/10" data-testid="photo-viewer-close" aria-label="Close"><X size={18} /></button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResetDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl" data-testid="reset-dialog">
        <AlertDialogHeader className="text-left">
          <span className="h-11 w-11 rounded-full bg-[var(--warn-bg)] text-[var(--warn)] grid place-items-center mb-2"><RotateCcw size={20} /></span>
          <AlertDialogTitle>Clear this week's checks?</AlertDialogTitle>
          <AlertDialogDescription>All exercises Monday to Sunday will be unticked. Your exercises, sets, reps and photos stay as they are.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-11 rounded-xl" data-testid="reset-cancel-btn">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="h-11 rounded-xl bg-[var(--danger)] hover:bg-[var(--danger)]/90" data-testid="reset-confirm-btn">Clear checks</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteDialog({ ex, onClose, onConfirm }) {
  return (
    <AlertDialog open={!!ex} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl" data-testid="delete-dialog">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>Delete "{ex?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>This removes it from your week.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-11 rounded-xl" data-testid="delete-cancel-btn">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="h-11 rounded-xl bg-[var(--danger)] hover:bg-[var(--danger)]/90" data-testid="delete-confirm-btn">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
