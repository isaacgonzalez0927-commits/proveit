/** Paths on proveit-goals.com that should open the native iOS app (Universal Links). */
export const UNIVERSAL_LINK_PATHS = [
  "/join/*",
  "/friends",
  "/profile/*",
  "/buddy-connect/*",
  "/dashboard",
  "/buddy",
  "/goals/*",
  "/settings",
  "/settings/*",
  "/pricing",
  "/api/auth/callback",
  "/api/auth/callback/*",
] as const;

export function getAppBundleId(): string {
  return process.env.APPLE_BUNDLE_ID?.trim() || "com.proveit.app";
}

export function getAppLinkHost(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (fromEnv) return fromEnv.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return "proveit-goals.com";
}

export function buildAppleAppSiteAssociation(teamId: string) {
  const appId = `${teamId.trim()}.${getAppBundleId()}`;
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: appId,
          paths: [...UNIVERSAL_LINK_PATHS],
        },
      ],
    },
  };
}
