"use client"

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false
  const token = localStorage.getItem("token")
  return !!token
}

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export const getUser = () => {
  if (typeof window === "undefined") return null
  const userStr = localStorage.getItem("user")
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export const logout = () => {
  if (typeof window === "undefined") return
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  window.location.href = "/login"
}

export const setAuth = (token: string, user: any) => {
  if (typeof window === "undefined") return
  localStorage.setItem("token", token)
  localStorage.setItem("user", JSON.stringify(user))
}