"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AccordionProps = {
  type?: "single";
  collapsible?: boolean;
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
};

type AccordionContextValue = {
  value: string | null;
  setValue: (v: string | null) => void;
  collapsible?: boolean;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  defaultValue = "",
  collapsible = false,
  className,
  children,
}: AccordionProps) {
  const [current, setCurrent] = React.useState<string | null>(defaultValue || null);
  return (
    <AccordionContext.Provider value={{ value: current, setValue: setCurrent, collapsible }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-value={value} className={cn("border rounded-lg mb-2", className)}>
      {children}
    </div>
  );
}

export function AccordionTrigger({
  children,
  className,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  value?: string;
}) {
  const ctx = React.useContext(AccordionContext);
  const itemValue = value || "";
  if (!ctx) return null;
  const active = ctx.value === itemValue;
  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-4 py-3 font-semibold flex items-center justify-between",
        active ? "bg-gray-100" : "bg-white",
        className,
      )}
      onClick={() => {
        if (ctx.collapsible && active) {
          ctx.setValue(null);
        } else {
          ctx.setValue(itemValue);
        }
      }}
    >
      {children}
      <span className="text-xs text-gray-500">{active ? "▲" : "▼"}</span>
    </button>
  );
}

export function AccordionContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx || ctx.value !== value) return null;
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}
