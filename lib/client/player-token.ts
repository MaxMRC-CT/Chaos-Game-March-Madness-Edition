export const PLAYER_TOKEN_STORAGE_KEY = "chaos_player_token";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function generatePlayerToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getPlayerToken() {
  if (!canUseStorage()) return null;

  const existing = window.localStorage.getItem(PLAYER_TOKEN_STORAGE_KEY);
  return existing && existing.trim() ? existing : null;
}

export function ensurePlayerToken() {
  if (!canUseStorage()) return "";

  const existing = getPlayerToken();
  if (existing) return existing;

  const next = generatePlayerToken();
  window.localStorage.setItem(PLAYER_TOKEN_STORAGE_KEY, next);
  return next;
}
