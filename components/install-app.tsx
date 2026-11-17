"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "bless-writes:install-dismissed-at";
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 5000;
// The reader, scanner, printable QR page, and offline shell are all
// distraction-free surfaces — the install nudge stays out of their way.
const HIDDEN_PREFIXES = ["/reader", "/scan", "/offline", "/qr"];

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissed() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY));
    return (
      Number.isFinite(dismissedAt) &&
      dismissedAt > 0 &&
      Date.now() - dismissedAt < DISMISS_FOR_MS
    );
  } catch {
    return false;
  }
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIphoneOrIpad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS reports a desktop Mac user agent, but keeps a touch screen.
  const isIpadOs =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;

  return isIphoneOrIpad || isIpadOs;
}

/**
 * Shows the browser's native install prompt on Chromium and the Home Screen
 * instructions on iOS. It deliberately renders nothing when already running as
 * an installed app, on distraction-free routes, or after a recent dismissal.
 */
export function InstallApp() {
  const pathname = usePathname();
  const hiddenByRoute = HIDDEN_PREFIXES.some((prefix) =>
    pathname?.startsWith(prefix),
  );
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage may be blocked; the prompt simply reappears next visit */
    }
  }, []);

  useEffect(() => {
    if (hiddenByRoute || isStandalone()) return;
    if (window.self !== window.top) return;
    if (wasDismissed()) return;
    if (!navigator.onLine) return;

    let timerDone = false;
    let showTimer: number | undefined;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      if (timerDone) setVisible(true);
    };

    const onInstalled = () => {
      deferredPrompt.current = null;
      setVisible(false);
    };

    const iosDevice = isIosDevice();

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    showTimer = window.setTimeout(() => {
      timerDone = true;
      if (deferredPrompt.current || iosDevice) setVisible(true);
    }, SHOW_AFTER_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, [hiddenByRoute]);

  if (hiddenByRoute || !visible) return null;

  const ios = isIosDevice();

  async function install() {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) return;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPrompt.current = null;

      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  }

  return (
    <aside
      aria-label="Install the Bless Writes app"
      aria-live="polite"
      className="install-nudge fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[23rem]"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-paper-soft/95 p-4 shadow-[0_18px_50px_-20px_rgba(34,31,27,0.45)] ring-1 ring-black/5 backdrop-blur">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 shrink-0 rounded-xl shadow-sm ring-1 ring-black/5"
        />

        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold leading-snug text-ink">
            Install Bless Writes
          </p>

          {ios ? (
            <>
              <p className="mt-1 text-xs leading-5 text-ink-soft">
                Tap the{" "}
                <Share
                  aria-hidden
                  className="mx-0.5 inline h-3.5 w-3.5 -translate-y-px"
                />{" "}
                Share button, then{" "}
                <span className="font-medium text-ink">Add to Home Screen</span>{" "}
                to keep the bookstore one tap away.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-pine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs leading-5 text-ink-soft">
                Add it to your home screen and open the shelf in one tap.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-pine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
                >
                  <Download aria-hidden className="h-3.5 w-3.5" />
                  Install app
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-full px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
                >
                  Not now
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-paper-deep hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
