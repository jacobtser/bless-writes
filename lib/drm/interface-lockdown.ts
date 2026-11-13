/**
 * Interface Lockdown — UI-level anti-copy / anti-inspection defense.
 *
 * This is the *front line* of the reading system's defense-in-depth: it makes
 * the convenient exfiltration paths (copy, cut, select, drag, right-click,
 * print, save, view-source, DevTools) unreachable in the reader surface.
 *
 * It is framework-agnostic and safe to install/uninstall repeatedly. The React
 * binding lives in `hooks/use-interface-lockdown.ts`.
 *
 * Honest scope: this is deterrence, not cryptography. A determined user with a
 * camera or a custom browser can always capture the rendered pixels. The real
 * guarantee is that no plaintext file is ever handed to, or stored by, the
 * client — see `lib/offline/*`.
 */

export type LockdownAction =
  | "contextmenu"
  | "copy"
  | "cut"
  | "selectstart"
  | "dragstart"
  | "print"
  | "save"
  | "view-source"
  | "devtools"
  | "select-all";

export interface InterfaceLockdownOptions {
  /** Enable/disable without removing the hook. Default: true. */
  enabled?: boolean;
  /** Leave text inputs alone (login forms, MoMo phone field). Default: true. */
  allowInputs?: boolean;
  /** Text written over the clipboard when a copy is attempted. */
  placeholder?: string;
  /** Observability hook — fires whenever an action is blocked. */
  onBlocked?: (action: LockdownAction, event: Event) => void;
}

export const DEFAULT_CLIPBOARD_PLACEHOLDER =
  "Copying is disabled for this protected eBook.";

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Installs the lockdown listeners and returns a disposer that removes them all.
 *
 * Entry points are explicit: pass `onBlocked` to observe attempts, `placeholder`
 * to customise the clipboard decoy, and `allowInputs: false` to harden screens
 * that have no form fields at all.
 */
export function installInterfaceLockdown(
  options: InterfaceLockdownOptions = {},
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const {
    enabled = true,
    allowInputs = true,
    placeholder = DEFAULT_CLIPBOARD_PLACEHOLDER,
    onBlocked,
  } = options;

  if (!enabled) return () => {};

  const isProtected = (event: Event) =>
    !(allowInputs && isEditableTarget(event.target));

  const fire = (action: LockdownAction, event: Event) => {
    onBlocked?.(action, event);
  };

  const cancel = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const wrap = (action: LockdownAction, handler?: (event: Event) => void) => {
    return (event: Event) => {
      if (!isProtected(event)) return;
      handler?.(event);
      cancel(event);
      fire(action, event);
    };
  };

  const onContextMenu = wrap("contextmenu");

  const onCopy = wrap("copy", (event) => {
    const clipboardEvent = event as ClipboardEvent;
    try {
      clipboardEvent.clipboardData?.setData("text/plain", placeholder);
    } catch {
      /* clipboard access can be denied; the preventDefault still applies */
    }
  });

  const onCut = wrap("cut", (event) => {
    const clipboardEvent = event as ClipboardEvent;
    try {
      clipboardEvent.clipboardData?.setData("text/plain", placeholder);
    } catch {
      /* see onCopy */
    }
  });

  const onSelectStart = wrap("selectstart");
  const onDragStart = wrap("dragstart");

  const onKeyDown = (event: KeyboardEvent) => {
    if (!isProtected(event)) return;
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;

    // Developer console: Ctrl+Shift+I/J/C, Cmd+Option+I/J/C
    const devtoolsChord =
      (mod && event.shiftKey && (key === "i" || key === "j" || key === "c")) ||
      (event.metaKey && event.altKey && (key === "i" || key === "j" || key === "c"));
    if (devtoolsChord) {
      cancel(event);
      fire("devtools", event);
      return;
    }

    // F12 (Windows/Linux DevTools)
    if (key === "f12") {
      cancel(event);
      fire("devtools", event);
      return;
    }

    if (!mod) return;

    const shortcuts: Record<string, LockdownAction> = {
      c: "copy",
      x: "cut",
      p: "print",
      s: "save",
      u: "view-source",
      a: "select-all",
    };
    const action = shortcuts[key];
    if (action) {
      cancel(event);
      fire(action, event);
    }
  };

  window.addEventListener("keydown", onKeyDown, { capture: true });
  document.addEventListener("contextmenu", onContextMenu, { capture: true });
  document.addEventListener("copy", onCopy, { capture: true });
  document.addEventListener("cut", onCut, { capture: true });
  document.addEventListener("selectstart", onSelectStart, { capture: true });
  document.addEventListener("dragstart", onDragStart, { capture: true });

  return () => {
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    document.removeEventListener("contextmenu", onContextMenu, { capture: true });
    document.removeEventListener("copy", onCopy, { capture: true });
    document.removeEventListener("cut", onCut, { capture: true });
    document.removeEventListener("selectstart", onSelectStart, { capture: true });
    document.removeEventListener("dragstart", onDragStart, { capture: true });
  };
}
