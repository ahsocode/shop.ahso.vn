// lib/auth-store.ts
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

// Tạo BroadcastChannel an toàn cho SSR
let CH: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("auth")
    : null;

// ---------- storage helpers ----------
function readLocal(): AppUser | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as AppUser) : null;
  } catch {
    return null;
  }
}
function writeLocal(u: AppUser | null) {
  if (u) localStorage.setItem(KEY, JSON.stringify(u));
  else localStorage.removeItem(KEY);
}

// ---------- public API ----------
export function getUser(): AppUser | null {
  // Truy cập cache, nếu chưa khởi tạo sẽ được điền ở getSnapshot (lần đầu)
  return cachedUser ?? null;
}
export function setUser(u: AppUser | null) {
  // Cập nhật cache trước khi phát sự kiện
  cachedUser = u;
  writeLocal(u);
  emit();
  CH?.postMessage({ type: "auth:update" });
}

// ---------- subscription ----------
type Listener = () => void;
let listeners = new Set<Listener>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: Listener) {
  listeners.add(cb);

  // Đồng bộ giữa các tab + khi localStorage đổi
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
    // Khi nhận thông điệp, đọc lại 1 lần rồi emit
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
  CH?.addEventListener("message", onBC as EventListener);

  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
    CH?.removeEventListener("message", onBC as EventListener);
  };
}

// ---------- hook (getSnapshot phải trả về cùng tham chiếu khi không đổi) ----------
let cachedUser: AppUser | null | undefined = undefined;

export function useAuthStore() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      // Chỉ đọc localStorage đúng 1 lần khi cache chưa khởi tạo
      if (cachedUser === undefined) {
        try {
          cachedUser = readLocal();
        } catch {
          cachedUser = null;
        }
      }
      return cachedUser;
    },
    () => null // server-side
  );
  return snapshot;
}
