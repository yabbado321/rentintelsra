import { useEffect, useRef, useState } from "react";

/**
 * Bump this when shipping a new wave of smart defaults you want to push to
 * every existing user exactly once. Older saved sessions on a different
 * version get wiped to the new defaults; subsequent edits stay persistent.
 */
export const SMART_DEFAULTS_VERSION = 2;
const VERSION_KEY = "rentintel:defaults-version";

function readVersion(): number {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

function writeVersion(v: number) {
  try {
    localStorage.setItem(VERSION_KEY, String(v));
  } catch {
    /* storage disabled */
  }
}

/** True the first time any hook runs after a defaults version bump. */
function defaultsAreStale() {
  return readVersion() < SMART_DEFAULTS_VERSION;
}

/** Called once per page-load to mark the user as upgraded. */
let markedThisLoad = false;
function markDefaultsApplied() {
  if (markedThisLoad) return;
  markedThisLoad = true;
  writeVersion(SMART_DEFAULTS_VERSION);
}

/**
 * useState that mirrors to localStorage. If `SMART_DEFAULTS_VERSION` has been
 * bumped since the user last loaded the app, the persisted value is discarded
 * once and replaced with `initial` so new macro defaults take effect.
 */
export function useSessionState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `rentintel:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      if (defaultsAreStale()) return initial;
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  // Defer the version bump to after first render so every hook on the page
  // sees the "stale" flag and resets together.
  useEffect(() => {
    markDefaultsApplied();
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      // Still write the initial value so refreshes are deterministic.
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* quota or disabled */
    }
  }, [storageKey, value]);

  return [value, setValue];
}
