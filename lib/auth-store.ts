"use client";
import { useSyncExternalStore } from "react";

export type AppUser = {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  role?: string;
};

const KEY = "user";

const channel: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("auth")
    : null;

function readLocal(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as AppUser) : null;
  } catch {
    return null;
  }
}

function writeLocal(u: AppUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(KEY, JSON.stringify(u));
  else localStorage.removeItem(KEY);
}

export function getUser(): AppUser | null {
  return cachedUser ?? null;
}

export function setUser(u: AppUser | null) {
  cachedUser = u;
  writeLocal(u);
  emit();
  channel?.postMessage({ type: "auth:update" });
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: Listener) {
  listeners.add(cb);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try {
      cachedUser = e.newValue ? (JSON.parse(e.newValue) as AppUser) : null;
    } catch {
      cachedUser = null;
    }
    emit();
  };
  
  const onBC = () => {
    try {
      cachedUser = readLocal();
    } catch {
      cachedUser = null;
    }
    emit();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  channel?.addEventListener("message", onBC as EventListener);

  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
    channel?.removeEventListener("message", onBC as EventListener);
  };
}

let cachedUser: AppUser | null | undefined = undefined;
let isHydrated = false; // ✅ Thêm flag để track hydration

export function useAuthStore() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      if (cachedUser === undefined) {
        try {
          cachedUser = readLocal();
        } catch {
          cachedUser = null;
        }
        isHydrated = true; // ✅ Đánh dấu đã hydrate
      }
      return cachedUser;
    },
    () => null
  );
  return snapshot;
}


export function getIsHydrated(): boolean {
  return isHydrated;
}
