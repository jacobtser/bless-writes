"use client";

import { useEffect, useRef } from "react";
import {
  installInterfaceLockdown,
  type InterfaceLockdownOptions,
} from "@/lib/drm/interface-lockdown";

/**
 * React binding for `installInterfaceLockdown`.
 *
 * The `onBlocked` callback is held in a ref so passing an inline closure does
 * not tear down and re-install the listeners on every render.
 */
export function useInterfaceLockdown(options: InterfaceLockdownOptions = {}) {
  const { enabled = true, allowInputs = true, placeholder } = options;

  const onBlockedRef = useRef(options.onBlocked);

  useEffect(() => {
    onBlockedRef.current = options.onBlocked;
  }, [options.onBlocked]);

  useEffect(() => {
    return installInterfaceLockdown({
      enabled,
      allowInputs,
      placeholder,
      onBlocked: (action, event) => onBlockedRef.current?.(action, event),
    });
  }, [enabled, allowInputs, placeholder]);
}
