"use client";
import { createContext, useContext, type ReactNode } from "react";
const CsrfContext = createContext("");
export function LocalSessionProvider({
  csrf,
  children,
}: {
  csrf: string;
  children: ReactNode;
}) {
  return <CsrfContext value={csrf}>{children}</CsrfContext>;
}
export function CsrfField() {
  return <input type="hidden" name="csrf" value={useContext(CsrfContext)} />;
}
