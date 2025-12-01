"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { setUser, useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import { useCart } from "@/lib/hooks/useCart";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải trang đăng nhập…</p>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore();
  const { refresh: refreshCart } = useCart(); // ⭐ Hook cart để refresh sau login

  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"username" | "email">("username");
  const [redirecting, setRedirecting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Nếu đã đăng nhập -> redirect
  useEffect(() => {
    if (!isHydrated || !currentUser || isLoading || redirecting) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const hasAuthCookie =
      typeof document !== "undefined" && document.cookie.includes("auth_token=");
    if (!hasAuthCookie) return;

    const redirectTo = searchParams.get("redirect") || "/";
    const isValidRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("/login");
    const finalRedirect = isValidRedirect ? redirectTo : "/";

    setRedirecting(true);
    const timer = setTimeout(() => router.push(finalRedirect), 200);
    return () => clearTimeout(timer);
  }, [isHydrated, currentUser, isLoading, redirecting, router, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // ⭐ Gửi cả identifier (hỗ trợ username/email/phone)
      const identifier = loginMethod === "username" ? formData.username : formData.email;
      const payload = {
        identifier: identifier.trim(),
        password: formData.password,
      };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ⭐ Quan trọng: gửi cookie
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          data?.error === "INVALID_CREDENTIALS"
            ? "Tên đăng nhập/email hoặc mật khẩu không đúng"
            : data?.error === "ACCOUNT_BLOCKED"
            ? "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ"
            : data?.error === "VALIDATION_ERROR"
            ? "Vui lòng kiểm tra lại thông tin đăng nhập"
            : data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại!";
        setError(msg);
        toast.error("Đăng nhập thất bại", { description: msg });
        return;
      }

      // Lưu token và user info
      localStorage.setItem("token", data.token);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        avatarUrl: data.user.avatarUrl || "/logo.png",
        role: data.user.role,
      };
      setUser(userData);

      toast.success("Đăng nhập thành công", {
        description: `Chào mừng trở lại, ${userData.fullName || userData.email}!`,
      });

      // ⭐ Refresh cart để lấy cart mới sau khi merge
      try {
        await refreshCart();
        console.log("✅ Cart refreshed after login");
      } catch (error) {
        console.error("❌ Failed to refresh cart:", error);
      }

      // Delay nhỏ để đảm bảo cookie được set
      await new Promise((r) => setTimeout(r, 150));

      const redirectTo = searchParams.get("redirect") || "/";
      const isValidRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("/login");
      const finalRedirect = isValidRedirect ? redirectTo : "/";

      setRedirecting(true);
      router.push(finalRedirect);
    } catch (err) {
      console.error("Login error:", err);
      const msg = "Không thể kết nối đến máy chủ. Vui lòng thử lại!";
      setError(msg);
      toast.error("Lỗi mạng", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    const redirectTo = searchParams.get("redirect") || "/";
    const redirectParam = encodeURIComponent(redirectTo);
    window.location.href = `/api/auth/google?redirect=${redirectParam}`;
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900"
          >
            <Image
              src="/logo.png"
              alt="AHSO Logo"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
            <span>AHSO</span>
          </Link>
        </div>

        <Card className="shadow-xl border-t-4 border-t-blue-600">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Đăng nhập</CardTitle>
            <CardDescription className="text-center">
              Đăng nhập để tiếp tục mua sắm
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Toggle phương thức */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLoginMethod("username")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === "username"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tên đăng nhập
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("email")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === "email"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Email
              </button>
            </div>

            {/* Hộp lỗi */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {loginMethod === "username" ? (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Nhập tên đăng nhập"
                      className="pl-10"
                      required
                      autoComplete="username"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Nhập email"
                      className="pl-10"
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-sm text-gray-600">Ghi nhớ đăng nhập</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang đăng nhập...
                  </span>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Đăng ký ngay
                </Link>
              </p>
            </div>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3 border-gray-300 hover:border-gray-400 bg-white"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                <span className="flex h-5 w-5 items-center justify-center">
                  <svg
                    role="img"
                    aria-label="Google"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="h-5 w-5"
                  >
                    <path fill="#EA4335" d="M24 9.5c3.15 0 5.3 1.37 6.52 2.51l4.76-4.64C31.44 4.28 27.96 3 24 3 14.82 3 7.25 8.88 4.36 16.44l5.98 4.64C11.94 14.53 17.41 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.66-.15-2.86-.47-4.09H24v7.71h12.9c-.26 1.9-1.66 4.76-4.76 6.68l7.34 5.68c4.38-4.04 7.02-9.97 7.02-16.98z" />
                    <path fill="#FBBC05" d="M10.34 28.92c-.46-1.38-.72-2.86-.72-4.42s.26-3.04.72-4.42l-5.98-4.64C2.74 17.78 2 20.81 2 24s.74 6.22 2.36 8.58l5.98-4.66z" />
                    <path fill="#34A853" d="M24 46c6.48 0 11.92-2.13 15.89-5.83l-7.34-5.68c-1.97 1.32-4.6 2.24-8.55 2.24-6.59 0-12.06-5.03-13.42-11.66l-5.98 4.64C7.25 39.12 14.82 46 24 46z" />
                    <path fill="none" d="M2 2h44v44H2z" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {googleLoading ? "Đang mở Google..." : "Tiếp tục với Google"}
                </span>
              </Button>

              <Link href="/">
                <Button variant="outline" className="w-full">
                  Quay lại trang chủ
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Bằng việc đăng nhập, bạn đồng ý với{" "}
          <Link href="#" className="text-blue-600 hover:text-blue-700">
            Điều khoản sử dụng
          </Link>{" "}
          và{" "}
          <Link href="#" className="text-blue-600 hover:text-blue-700">
            Chính sách bảo mật
          </Link>
        </p>
      </div>
    </div>
  );
}
