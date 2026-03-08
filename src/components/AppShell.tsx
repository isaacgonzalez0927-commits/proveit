"use client";

import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { IntroSplash } from "@/components/IntroSplash";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroSplash />
      <Header />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
