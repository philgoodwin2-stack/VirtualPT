import { Dumbbell } from "lucide-react";
import { Show } from "@clerk/react";
import { Navigate } from "react-router-dom";
import { GymSilhouettes } from "@/components/GymSilhouettes";
import { IosInstallHint } from "@/components/IosInstallHint";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center px-4 pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-10" data-testid="auth-page">
      <Show when="signed-in"><Navigate to="/" replace /></Show>
      <div className="flex items-center gap-3 mb-3 fade-up">
        <span className="h-11 w-11 rounded-xl bg-[var(--teal)] text-white grid place-items-center">
          <Dumbbell size={22} />
        </span>
        <span className="text-2xl font-semibold tracking-tight">VirtualPT</span>
      </div>
      <p className="text-sm text-[var(--ink-2)] mb-8 text-center max-w-xs fade-up" style={{ animationDelay: "60ms" }}>
        Plan your week, tick off every set. Your plan syncs to any device you sign in on.
      </p>
      <div className="w-full max-w-[400px]"><IosInstallHint /></div>
      <div className="flex justify-center w-full fade-up" style={{ animationDelay: "120ms" }}>{children}</div>
      <GymSilhouettes className="mt-10 w-full max-w-md text-[var(--sil)] fade-up" testId="auth-silhouettes" />
    </div>
  );
}
