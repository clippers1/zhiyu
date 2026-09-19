import React, { createContext, useContext, useMemo } from "react";
import { createContentRepository } from "./services/content";

const ReaderContext = createContext(null);
export const contentKey = (method, args) => `${method}:${JSON.stringify(args)}`;
export function ReaderProvider({ runtime, initialRoute, preloaded, children }) {
  const repository = useMemo(() => createContentRepository({ apiBase: runtime.apiBase || "", assetBase: runtime.assetBase || "/" }), [runtime.apiBase, runtime.assetBase]);
  return <ReaderContext.Provider value={{ runtime, initialRoute, preloaded, repository }}>{children}</ReaderContext.Provider>;
}
export const useReader = () => useContext(ReaderContext);
