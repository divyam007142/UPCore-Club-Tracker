export const TOKEN_KEY = "upcore_admin_token";

export function getStoredToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
