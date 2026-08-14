import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex Capacity Governor",
  description: "Plan bounded AI-assisted development work before execution.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            <span aria-hidden="true" className="brand-mark">
              CG
            </span>
            <span>
              <strong>Capacity Governor</strong>
              <small>Manual preflight workspace</small>
            </span>
          </Link>
          <span className="status-chip">Tranche 001 · Draft only</span>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          Manual inputs are stored without forecast, policy, or affordability
          interpretation.
        </footer>
      </body>
    </html>
  );
}
