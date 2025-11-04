"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getUser, getToken, logout } from "@/lib/auth-client"

export function useAuth(requireAuth = false) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    const userData = getUser()

    if (!token || !userData) {
      setUser(null)
      setLoading(false)
      if (requireAuth) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      }
      return
    }

    // Verify token with server
    fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Invalid token")
        const data = await res.json()
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => {
        logout()
        if (requireAuth) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
        }
      })
  }, [requireAuth, router, pathname])

  return { user, loading, logout }
}