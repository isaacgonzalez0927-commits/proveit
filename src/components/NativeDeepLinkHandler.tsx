"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAppLinkHost } from "@/lib/appleAppSiteAssociation";
import { isNativeCapacitorShell } from "@/lib/nativeWidgetBridge";

function inAppPath(url: string): string | null {
  try {
    const u = new URL(url);
    const host = getAppLinkHost();
    const okHost =
      u.hostname === host ||
      u.hostname === `www.${host}` ||
      u.hostname.endsWith(".vercel.app");
    if (!okHost) return null;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

/** Navigate Capacitor WebView when the app is opened via Universal Link or custom URL. */
export function NativeDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeCapacitorShell()) return;

    let cancelled = false;
    let removeOpen: (() => void) | undefined;

    void import("@capacitor/app")
      .then(({ App }) => {
        if (cancelled) return;

        const go = (url: string) => {
          const path = inAppPath(url);
          if (path) router.push(path);
        };

        void App.getLaunchUrl().then((result) => {
          if (result?.url) go(result.url);
        });

        void App.addListener("appUrlOpen", (event) => {
          go(event.url);
        }).then((handle) => {
          removeOpen = () => void handle.remove();
        });
      })
      .catch(() => {
        /* @capacitor/app not installed — Universal Links may still load in WebView */
      });

    return () => {
      cancelled = true;
      removeOpen?.();
    };
  }, [router]);

  return null;
}
