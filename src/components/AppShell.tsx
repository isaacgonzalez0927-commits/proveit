"use client";

import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
