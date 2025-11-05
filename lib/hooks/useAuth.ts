"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore, setUser, getIsHydrated } from "@/lib/auth-store"

export function useAuth(requireAuth = false) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)

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

      // Nếu có token → verify với server
      try {
        console.log("🔍 Verifying token...")
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })

        if (!res.ok) {
          console.error("❌ Token invalid, status:", res.status)
          throw new Error("Invalid token")
        }

        const { user: freshUser } = await res.json()
        console.log("✅ Token valid, user:", freshUser.email)

        if (mounted) {
          // Cập nhật store với data mới
          setUser({
            id: freshUser.id,
            email: freshUser.email,
            fullName: freshUser.fullName,
            avatarUrl: freshUser.avatarUrl || "/logo.png",
            role: freshUser.role,
          })
          setLoading(false)
          setVerified(true)
        }
      } catch (err) {
        console.error("❌ Token verification failed:", err)
        if (mounted) {
          // Clear auth
          setUser(null)
          localStorage.removeItem("token")
          setLoading(false)
          setVerified(true)
          
          // ✅ Chống redirect loop: Không redirect nếu đang ở trang login
          if (requireAuth && !pathname.startsWith('/login')) {
            console.log("❌ Auth required, redirecting to login")
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
          }
        }
      }
    }

    verify()
    return () => { mounted = false }
  }, [requireAuth, router, pathname]) // ✅ Bỏ dependency vào user để tránh loop

  const logout = () => {
    console.log("🚪 Logging out...")
    setUser(null)
    localStorage.removeItem("token")
    router.push("/login")
  }

  return { user, loading, logout, verified }
}