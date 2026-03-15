export const DEVICE_SESSION_STORAGE_KEY = "chaos-league-sessions";

export type SavedLeagueSession = {
  leagueId: string;
  leagueName: string;
  leagueCode: string;
  playerId: string;
  nickname: string;
  joinedAt: string;
  lastVisitedAt: string;
};

export type DeviceSession = {
  deviceSessionId: string;
  leagues: SavedLeagueSession[];
};

type SavedLeagueInput = Omit<SavedLeagueSession, "joinedAt" | "lastVisitedAt"> & {
  joinedAt?: string;
  lastVisitedAt?: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse(raw: string | null): DeviceSession | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DeviceSession>;
    if (!parsed || typeof parsed !== "object") return null;
    const deviceSessionId =
      typeof parsed.deviceSessionId === "string" && parsed.deviceSessionId.trim()
        ? parsed.deviceSessionId
        : "";

    const leagues = Array.isArray(parsed.leagues)
      ? parsed.leagues
          .filter((league): league is SavedLeagueSession => {
            return Boolean(
              league &&
                typeof league === "object" &&
                typeof league.leagueId === "string" &&
                typeof league.leagueName === "string" &&
                typeof league.leagueCode === "string" &&
                typeof league.playerId === "string" &&
                typeof league.nickname === "string" &&
                typeof league.joinedAt === "string" &&
                typeof league.lastVisitedAt === "string",
            );
          })
          .sort(
            (a, b) =>
              new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime(),
          )
      : [];

    if (!deviceSessionId) return null;

    return { deviceSessionId, leagues };
  } catch {
    return null;
  }
}

function generateDeviceSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function writeSession(session: DeviceSession) {
  if (!canUseStorage()) return session;
  window.localStorage.setItem(DEVICE_SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function getDeviceSession(): DeviceSession | null {
  if (!canUseStorage()) return null;
  return safeParse(window.localStorage.getItem(DEVICE_SESSION_STORAGE_KEY));
}

export function ensureDeviceSessionId() {
  const existing = getDeviceSession();
  if (existing?.deviceSessionId) return existing.deviceSessionId;

  const session: DeviceSession = {
    deviceSessionId: generateDeviceSessionId(),
    leagues: existing?.leagues ?? [],
  };
  writeSession(session);
  return session.deviceSessionId;
}

export function getSavedLeagues() {
  return getDeviceSession()?.leagues ?? [];
}

export function upsertSavedLeague(input: SavedLeagueInput) {
  const now = new Date().toISOString();
  const session = getDeviceSession() ?? {
    deviceSessionId: ensureDeviceSessionId(),
    leagues: [],
  };

  const existing = session.leagues.find((league) => league.leagueId === input.leagueId);
  const nextLeague: SavedLeagueSession = {
    leagueId: input.leagueId,
    leagueName: input.leagueName,
    leagueCode: input.leagueCode,
    playerId: input.playerId,
    nickname: input.nickname,
    joinedAt: existing?.joinedAt ?? input.joinedAt ?? now,
    lastVisitedAt: input.lastVisitedAt ?? now,
  };

  const nextLeagues = [
    nextLeague,
    ...session.leagues.filter((league) => league.leagueId !== input.leagueId),
  ].sort(
    (a, b) =>
      new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime(),
  );

  writeSession({
    deviceSessionId: session.deviceSessionId || ensureDeviceSessionId(),
    leagues: nextLeagues,
  });

  return nextLeague;
}

export function removeSavedLeague(leagueId: string) {
  const session = getDeviceSession();
  if (!session) return;

  writeSession({
    ...session,
    leagues: session.leagues.filter((league) => league.leagueId !== leagueId),
  });
}

export function clearSavedLeagues() {
  const session = getDeviceSession();
  if (!session) return;

  writeSession({
    ...session,
    leagues: [],
  });
}

export function getMostRecentLeague() {
  return getSavedLeagues()[0] ?? null;
}

export function touchSavedLeague(leagueId: string) {
  const session = getDeviceSession();
  if (!session) return null;

  const target = session.leagues.find((league) => league.leagueId === leagueId);
  if (!target) return null;

  return upsertSavedLeague({
    ...target,
    joinedAt: target.joinedAt,
    lastVisitedAt: new Date().toISOString(),
  });
}
