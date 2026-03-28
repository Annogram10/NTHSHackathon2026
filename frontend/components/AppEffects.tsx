"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import LoadingLines from "@/components/ui/loading-lines";
import ProceduralGroundBackground from "@/components/ui/procedural-ground-background";
import TubesCursor from "@/components/ui/tubes-curor";

interface AppEffectsProps {
  children: ReactNode;
}

export function AppEffects({ children }: AppEffectsProps) {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLoader(false);
    }, 1350);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {!showLoader ? <ProceduralGroundBackground /> : null}
      {!showLoader ? <TubesCursor /> : null}
      {showLoader ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(135,92,255,0.22)_0%,_rgba(15,15,20,0.96)_46%,_#09090c_100%)]">
          <div className="flex flex-col items-center gap-5">
            <LoadingLines />
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-200">
                Vouch
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                Loading source-backed verification
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
