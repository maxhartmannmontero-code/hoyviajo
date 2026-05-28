"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "hv_masked";

interface MaskContextValue {
  masked: boolean;
  toggleMask: () => void;
}

const MaskContext = createContext<MaskContextValue>({ masked: false, toggleMask: () => {} });

export function MaskProvider({ children }: { children: React.ReactNode }) {
  const [masked, setMasked] = useState(false);

  useEffect(() => {
    setMasked(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggleMask() {
    setMasked(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return <MaskContext.Provider value={{ masked, toggleMask }}>{children}</MaskContext.Provider>;
}

export function useMask() {
  return useContext(MaskContext);
}
