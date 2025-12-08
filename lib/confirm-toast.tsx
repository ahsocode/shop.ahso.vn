'use client';

import { toast } from "sonner";

type ConfirmOptions = {
  description?: string;
  confirmText?: string;
  cancelText?: string;
};

export function confirmToast(message: string, options?: ConfirmOptions) {
  const { description, confirmText = "Đồng ý", cancelText = "Hủy" } = options ?? {};

  return new Promise<boolean>((resolve) => {
    toast.custom(
      (t) => (
        <div className="w-[320px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="text-sm font-semibold text-gray-900">{message}</div>
          {description && (
            <div className="mt-1 text-xs text-gray-500">{description}</div>
          )}
          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t);
                resolve(false);
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t);
                resolve(true);
              }}
              className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  });
}
