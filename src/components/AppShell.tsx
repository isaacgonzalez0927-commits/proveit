"use client";

import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { IntroSplash } from "@/components/IntroSplash";
import { TourSpotlight } from "@/components/TourSpotlight";
import { WidgetSync } from "@/components/WidgetSync";
import { NativeDeepLinkHandler } from "@/components/NativeDeepLinkHandler";
import { NativeNotificationSync } from "@/components/NativeNotificationSync";
import { FullscreenAppHint } from "@/components/FullscreenAppHint";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroSplash />
      <NativeDeepLinkHandler />
      <NativeNotificationSync />
      <FullscreenAppHint />
      <Header />
      <WidgetSync />
      <PageTransition>{children}</PageTransition>
      <TourSpotlight />
    </>
  );
}
