import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireLocalAccess } from "../server/access";
import { LocalSessionProvider } from "../components/local-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capacity Governor by Neverlost Systems",
  description: "Plan bounded AI-assisted development work before execution.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const path = (await headers()).get("x-cg-path");
  let csrf = "";
  if (path !== "/pair") {
    try {
      csrf = (await requireLocalAccess()).session.csrf;
    } catch {
      redirect("/pair");
    }
  }
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            <Image
              src="/neverlost-systems-logo.png"
              alt="Neverlost Systems"
              width={48}
              height={48}
              loading="eager"
              unoptimized
            />
            <span>
              <strong>Capacity Governor</strong>
              <small>by Neverlost Systems</small>
            </span>
          </Link>
          <span className="status-chip">Local manual preflight</span>
        </header>
        <main>
          <LocalSessionProvider csrf={csrf}>{children}</LocalSessionProvider>
        </main>
        {csrf ? (
          <form className="session-controls" action="/access/end" method="post">
            <input type="hidden" name="csrf" value={csrf} />
            <button type="submit">End local session</button>
          </form>
        ) : null}
        <footer className="site-footer">
          Manual structural drafts remain separate from reviewed capacity
          preflight evidence. No automatic execution is performed.
        </footer>
      </body>
    </html>
  );
}
