export function normalizeDisplayName(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function makeNicknameKey(displayName: string) {
  return normalizeDisplayName(displayName).toLowerCase();
}
