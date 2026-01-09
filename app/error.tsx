"use client";

import ErrorPage from "@/components/error/ErrorPage";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <ErrorPage onRetry={reset} />;
}
