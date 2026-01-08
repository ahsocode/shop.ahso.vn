'use client';

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";

type ConfirmOptions = {
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "toast" | "modal";
};

export function confirmToast(message: string, options?: ConfirmOptions) {
  const {
    description,
    confirmText = "Đồng ý",
    cancelText = "Hủy",
    variant = "toast",
  } = options ?? {};

  if (variant === "modal") {
    return confirmModal(message, { description, confirmText, cancelText });
  }

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

function confirmModal(
  message: string,
  options: Omit<ConfirmOptions, "variant">,
) {
  const { description, confirmText = "Đồng ý", cancelText = "Hủy" } = options ?? {};

  return new Promise<boolean>((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const close = (value: boolean) => {
      root.unmount();
      container.remove();
      resolve(value);
    };

    const Modal = () => {
      useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Escape") close(false);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
      }, []);

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => close(false)}
        >
          <div
            className="w-[320px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-900">{message}</div>
            {description && (
              <div className="mt-1 text-xs text-gray-500">{description}</div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      );
    };

    root.render(<Modal />);
  });
}
