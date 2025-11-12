// app/admin/_lib/fetcher.ts
export function makeHeaders(base?: HeadersInit) {
  const h = new Headers(base);
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) h.set("Authorization", `Bearer ${token}`);
  }
  return h;
}

export async function getJSON<T>(url: string) {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function postJSON<T>(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: makeHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function patchJSON<T>(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: makeHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function del(url: string) {
  const res = await fetch(url, { method: "DELETE", headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return true;
}
