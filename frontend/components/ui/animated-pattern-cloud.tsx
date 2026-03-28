"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function AnimatedPatternCloud() {
  const [count, setCount] = useState(0);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-sm"
      )}
    >
      <h1 className="mb-2 text-2xl font-bold">Component Example</h1>
      <h2 className="text-xl font-semibold">{count}</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCount((prev) => prev - 1)}
          className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => setCount((prev) => prev + 1)}
          className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
        >
          +
        </button>
      </div>
    </div>
  );
}

export const Component = AnimatedPatternCloud;
