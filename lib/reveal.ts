import type { CSSProperties } from "react";

export type RevealDelayStyle = CSSProperties & { "--d"?: string };

export function withRevealDelay(delay: string | number): RevealDelayStyle {
  return { "--d": typeof delay === "number" ? `${delay}` : delay };
}
