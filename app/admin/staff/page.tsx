"use client";
import { AdminRoute } from "@/components/auth/admin-route";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Row = { id: string; username: string; fullName: string; email: string; phoneE164: string; role: string; createdAt: string; isBlocked: boolean };

export default function StaffAdminPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [blockable, setBlockable] = useState(true);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [q, page, pageSize]);

  useEffect(() => {
    let aborted = false;
    async function run() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token") || "";
        const r = await fetch(`/api/admin/users/staff?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await r.json();
        if (!aborted) {
          setRows(json.data || []);
          setTotal(json.meta?.total || 0);
          setBlockable(json.meta?.blockable ?? true);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    run();
    return () => { aborted = true };
  }, [params]);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", fullName: "" });
  const resetForm = () => setForm({ username: "", password: "", fullName: "" });
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [blockConfirm, setBlockConfirm] = useState<{ row: Row; next: boolean } | null>(null);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("token") || "";
    const r = await fetch(`/api/admin/users/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setShowCreate(false);
      resetForm();
      setPage(1);
      toast.success("Đã tạo tài khoản nhân viên");
    } else {
      const j = await r.json().catch(() => ({}));
      toast.error(j.error || "Tạo nhân viên thất bại");
    }
  }

  const requestRemove = (row: Row) => setDeleteTarget(row);

  async function confirmRemove() {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token") || "";
    try {
      setPendingDeleteId(deleteTarget.id);
      const r = await fetch(`/api/admin/users/staff/${deleteTarget.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Xóa thất bại");
      }
      setRows((s) => s.filter((x) => x.id !== deleteTarget.id));
      toast.success(`Đã xóa nhân viên ${deleteTarget.fullName || deleteTarget.username}`);
      setDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xóa nhân viên";
      toast.error(message);
    } finally {
      setPendingDeleteId(null);
    }
  }

  const requestToggleBlock = (row: Row) => {
    if (!blockable) {
      toast.info("Tính năng khóa tài khoản nhân viên đang được đồng bộ. Vui lòng chạy prisma migrate + prisma generate.");
      return;
    }
    setBlockConfirm({ row, next: !row.isBlocked });
  };

  async function confirmToggleBlock() {
    if (!blockConfirm) return;
    const { row, next } = blockConfirm;
    const token = localStorage.getItem("token") || "";
    try {
      setPendingBlockId(row.id);
      const r = await fetch(`/api/admin/users/staff/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isBlocked: next }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Cập nhật trạng thái thất bại");
      }
      setRows((rows) => rows.map((current) => (current.id === row.id ? { ...current, isBlocked: next } : current)));
      toast.success(next ? "Đã khóa tài khoản nhân viên" : "Đã mở khóa tài khoản nhân viên");
      setBlockConfirm(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái lúc này";
      toast.error(message);
    } finally {
      setPendingBlockId(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminRoute>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Nhân viên</h1>
          <button onClick={() => setShowCreate(true)} className="rounded-md bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700">Thêm mới</button>
        </div>

        <div className="flex gap-2">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm theo tên/email/điện thoại" className="w-full max-w-md rounded-md border px-3 py-2" />
          <span className="text-sm text-gray-600 self-center">Tổng: {total}</span>
        </div>

        {!blockable && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 text-sm text-yellow-900 px-4 py-3">
            Khóa/mở khóa nhân viên chưa khả dụng. Vui lòng đồng bộ cơ sở dữ liệu với <code className="font-mono">prisma migrate deploy</code> và <code className="font-mono">prisma generate</code>.
          </div>
        )}

        <div className="rounded-lg border overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Username</th>
                <th className="px-3 py-2 text-left">Họ tên</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Điện thoại</th>
                <th className="px-3 py-2">Vai trò</th>
                <th className="px-3 py-2 text-center">Trạng thái</th>
                <th className="px-3 py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Đang tải…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Không có dữ liệu</td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2 font-mono">{u.username}</td>
                    <td className="px-3 py-2">{u.fullName}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.phoneE164}</td>
                    <td className="px-3 py-2 text-center">{u.role}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isBlocked ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {u.isBlocked ? "Đã khóa" : "Hoạt động"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center space-x-3">
                      <button
                        onClick={() => requestToggleBlock(u)}
                        disabled={!blockable || pendingBlockId === u.id}
                        className="text-blue-600 hover:underline disabled:opacity-50"
                        title={blockable ? undefined : "Vui lòng đồng bộ Prisma để sử dụng chức năng này"}
                      >
                        {u.isBlocked ? "Mở khóa" : "Khóa"}
                      </button>
                      <button onClick={() => requestRemove(u)} className="text-red-600 hover:underline">Xóa</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex gap-2 justify-center">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-50">Trước</button>
            <span className="text-sm self-center">{page}/{pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1 rounded border disabled:opacity-50">Sau</button>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <form onSubmit={createStaff} className="w-full max-w-md rounded-xl bg-white p-4 shadow">
              <h2 className="font-semibold mb-3">Thêm nhân viên</h2>
              <div className="grid gap-2">
                <input required value={form.username} onChange={(e)=>setForm({...form, username:e.target.value})} placeholder="Username" className="rounded-md border px-3 py-2" />
                <input required type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} placeholder="Mật khẩu" className="rounded-md border px-3 py-2" />
                <input required value={form.fullName} onChange={(e)=>setForm({...form, fullName:e.target.value})} placeholder="Họ tên" className="rounded-md border px-3 py-2" />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={()=>{setShowCreate(false); resetForm();}} className="px-3 py-2 rounded-md border">Hủy</button>
                <button type="submit" className="px-3 py-2 rounded-md bg-blue-600 text-white">Lưu</button>
              </div>
            </form>
          </div>
        )}
      </div>
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle>Xóa nhân viên</DialogTitle>
            </div>
            <DialogDescription>
              Bạn có chắc muốn xóa{" "}
              <strong className="text-gray-900">{deleteTarget?.fullName || deleteTarget?.username}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border"
              onClick={() => setDeleteTarget(null)}
              disabled={pendingDeleteId === deleteTarget?.id}
            >
              Hủy
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-red-600 text-white disabled:opacity-60"
              onClick={confirmRemove}
              disabled={pendingDeleteId === deleteTarget?.id}
            >
              Xóa
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockConfirm} onOpenChange={(open) => !open && setBlockConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <DialogTitle>{blockConfirm?.next ? "Khóa tài khoản nhân viên" : "Mở khóa tài khoản"}</DialogTitle>
            </div>
            <DialogDescription>
              {blockConfirm?.next
                ? "Nhân viên sẽ không thể đăng nhập cho tới khi bạn mở khóa."
                : "Nhân viên sẽ đăng nhập lại bình thường sau khi mở khóa."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border"
              onClick={() => setBlockConfirm(null)}
              disabled={pendingBlockId === blockConfirm?.row.id}
            >
              Hủy
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
              onClick={confirmToggleBlock}
              disabled={pendingBlockId === blockConfirm?.row.id}
            >
              {blockConfirm?.next ? "Khóa" : "Mở khóa"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminRoute>
  );
}
