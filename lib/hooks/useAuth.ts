"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { useAuthStore, setUser, getIsHydrated, getUser } from "@/lib/auth-store"

let inFlightVerify: Promise<ReturnType<typeof getUser>> | null = null
let lastVerifiedAt = 0
let lastToken: string | null = null

export function useAuth(requireAuth = false) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const toastShown = useRef(false)

  const showLoginToastIfNeeded = () => {
    if (toastShown.current || typeof window === "undefined") return
    const url = new URL(window.location.href)
    const loginStatus = url.searchParams.get("login")
    if (loginStatus === "google_success") {
      toast.success("Đăng nhập Google thành công")
    } else if (loginStatus === "google_failed") {
      toast.error("Đăng nhập Google thất bại")
    } else {
      return
    }
    url.searchParams.delete("login")
    window.history.replaceState(null, "", url.toString())
    toastShown.current = true
  }

  useEffect(() => {
    let mounted = true

    async function verify() {
      console.log("🔄 useAuth verify started for:", pathname)
      
      // ✅ Đợi store hydrate xong (tối đa 1 giây)
      let attempts = 0
      while (!getIsHydrated() && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 50))
        attempts++
      }

      console.log("✅ Store hydrated after", attempts * 50, "ms")

      if (!mounted) return

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

      // Nếu không có token
      if (!token) {
        if (mounted) {
          setUser(null)
          setLoading(false)
          setVerified(true)
          
          // ✅ Chống redirect loop: Không redirect nếu đang ở trang login
          if (requireAuth && !pathname.startsWith('/login')) {
            console.log("❌ No token, redirecting to login")
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
          }
        }
        return
      }

      const cachedUser = getUser()
      const now = Date.now()

      if (
        cachedUser &&
        lastToken === token &&
        now - lastVerifiedAt < 60_000
      ) {
        if (mounted) {
          setLoading(false)
          setVerified(true)
          showLoginToastIfNeeded()
        }
        return
      }

      // Nếu có token → verify với server (dùng chung promise để tránh gọi lặp)
      try {
        console.log("🔍 Verifying token...")
        if (!inFlightVerify) {
          inFlightVerify = fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          })
            .then(async (res) => {
              if (!res.ok) {
                console.error("❌ Token invalid, status:", res.status)
                throw new Error("Invalid token")
              }
              const { user: freshUser } = await res.json()
              return {
                id: freshUser.id,
                email: freshUser.email,
                fullName: freshUser.fullName,
                avatarUrl: freshUser.avatarUrl || "/logo.png",
                role: freshUser.role,
              }
            })
            .finally(() => {
              inFlightVerify = null
            })
        }

        const verifiedUser = await inFlightVerify
        console.log("✅ Token valid, user:", verifiedUser?.email)

        if (mounted) {
          // Cập nhật store với data mới
          if (verifiedUser) {
            setUser(verifiedUser)
          }
          lastToken = token
          lastVerifiedAt = Date.now()
          setLoading(false)
          setVerified(true)
          showLoginToastIfNeeded()
        }
      } catch (err) {
        console.error("❌ Token verification failed:", err)
        if (mounted) {
          // Clear auth
          setUser(null)
          localStorage.removeItem("token")
          lastToken = null
          lastVerifiedAt = 0
          setLoading(false)
          setVerified(true)
          
          // ✅ Chống redirect loop: Không redirect nếu đang ở trang login
          if (requireAuth && !pathname.startsWith('/login')) {
            console.log("❌ Auth required, redirecting to login")
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
          }
          showLoginToastIfNeeded()
        }
      }
    }

    verify()
    return () => { mounted = false }
  }, [requireAuth, router, pathname]) // ✅ Bỏ dependency vào user để tránh loop

  const logout = async () => {
    console.log("🚪 Logging out...")
    setUser(null)
    localStorage.removeItem("token")
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch (error) {
      console.error("Logout API error:", error)
    }
    toast.success("Đã đăng xuất")
    router.push("/login")
  }

  return { user, loading, logout, verified }
}
