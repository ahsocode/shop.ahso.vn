// lib/cart-storage.ts
export type LocalCartItem = {
  id: string;      // unique key trong local (vd sku hoặc sku+opts)
  sku: string;
  name: string;
  image?: string;
  price: number;
  qty: number;
  slug?: string;
};

const KEY = "cart:v1";

export function ls_get(): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalCartItem[]) : [];
  } catch { return []; }
}

export function ls_set(items: LocalCartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export function ls_clear() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function ls_add(item: Omit<LocalCartItem, "id"> & { id?: string }) {
  const items = ls_get();
  const id = item.id ?? item.sku; // mặc định theo sku
  const idx = items.findIndex(x => x.id === id);
  if (idx >= 0) {
    items[idx].qty += item.qty || 1;
  } else {
    items.push({ ...item, id, qty: item.qty || 1 });
  }
  ls_set(items);
}

export function ls_setQty(id: string, qty: number) {
  const items = ls_get();
  const i = items.findIndex(x => x.id === id);
  if (i >= 0) {
    if (qty <= 0) items.splice(i, 1);
    else items[i].qty = qty;
    ls_set(items);
  }
}

export function ls_remove(id: string) {
  const items = ls_get().filter(x => x.id !== id);
  ls_set(items);
}
