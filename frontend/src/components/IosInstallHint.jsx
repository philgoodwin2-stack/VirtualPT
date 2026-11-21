import { useState } from "react";
import { Share, X, PlusSquare } from "lucide-react";

const KEY = "vpt-ios-hint-dismissed";
const isIosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};
const isStandalone = () => window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;

// iOS has no install prompt, so show how to add VirtualPT to the home screen.
export function IosInstallHint() {
  const [show, setShow] = useState(() => isIosSafari() && !isStandalone() && !localStorage.getItem(KEY));
  if (!show) return null;
  const close = () => {
    localStorage.setItem(KEY, "1");
    setShow(false);
  };
  return (
    <div className="fade-up mb-4 rounded-2xl border border-[var(--ok-line)] bg-[var(--ok-bg)] p-3.5 flex gap-3 items-start" data-testid="ios-install-hint">
      <PlusSquare size={20} className="shrink-0 mt-0.5 text-[var(--teal)]" />
      <p className="text-sm text-[var(--ink-2)] flex-1">
        Install VirtualPT: tap <Share size={14} className="inline -mt-0.5 text-[var(--teal)]" /> <b className="text-[var(--ink)]">Share</b>, then <b className="text-[var(--ink)]">Add to Home Screen</b>.
      </p>
      <button onClick={close} className="h-8 w-8 -mr-1 -mt-1 grid place-items-center rounded-full text-[var(--ink-3)]" aria-label="Dismiss" data-testid="ios-install-hint-close">
        <X size={16} />
      </button>
    </div>
  );
}
