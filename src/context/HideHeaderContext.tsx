"use client";

import { createContext, useContext, useState } from "react";

const HideHeaderContext = createContext<[boolean, (hide: boolean) => void]>([false, () => {}]);

export function HideHeaderProvider({ children }: { children: React.ReactNode }) {
  const [hide, setHide] = useState(false);
  return (
    <HideHeaderContext.Provider value={[hide, setHide]}>
      {children}
    </HideHeaderContext.Provider>
  );
}

export function useHideHeader() {
  return useContext(HideHeaderContext);
}
