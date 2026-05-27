"use client";

import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { IntroSplash } from "@/components/IntroSplash";
import { TourSpotlight } from "@/components/TourSpotlight";
import { WidgetSync } from "@/components/WidgetSync";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroSplash />
      <Header />
      <WidgetSync />
      <PageTransition>{children}</PageTransition>
      <TourSpotlight />
    </>
  );
}
