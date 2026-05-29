const STORAGE_KEY = "proveit_post_auth_redirect";

export function setPostAuthRedirect(path: string): void {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/")) return;
  window.sessionStorage.setItem(STORAGE_KEY, path);
}

export function consumePostAuthRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  if (value) window.sessionStorage.removeItem(STORAGE_KEY);
  return value;
}
