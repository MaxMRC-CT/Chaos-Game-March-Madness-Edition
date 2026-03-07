/**
 * v2.3 Upset Exposure Summary: Cinderella %, Villain %, high seed risk.
 * No scoring modifiers – analytics only.
 */

type PickLite = {
  teamId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  memberId: string;
  seed: number;
};

type OwnershipByRole = {
  heroPct: number;
  villainPct: number;
  cinderellaPct: number;
};

export type UpsetExposureSummary = {
  totalCinderellaExposurePct: number;
  totalVillainExposurePct: number;
  highSeedRiskSummary: {
    heroExposurePct: number;
    villainExposurePct: number;
    cinderellaExposurePct: number;
    highSeedTeamCount: number;
  };
};

/**
 * Compute league-wide upset exposure: Cinderella %, Villain %, high-seed risk.
 */
export function computeUpsetExposure(
  picks: PickLite[],
  ownershipByRole: Record<string, OwnershipByRole>,
  memberCount: number,
  teamSeeds: Map<string, number>,
): UpsetExposureSummary {
  if (memberCount <= 0) {
    return {
      totalCinderellaExposurePct: 0,
      totalVillainExposurePct: 0,
      highSeedRiskSummary: {
        heroExposurePct: 0,
        villainExposurePct: 0,
        cinderellaExposurePct: 0,
        highSeedTeamCount: 0,
      },
    };
  }

  let cinderellaExposure = 0;
  let villainExposure = 0;
  const highSeedPicks = picks.filter((p) => {
    const seed = teamSeeds.get(p.teamId) ?? p.seed ?? 99;
    return seed <= 4;
  });

  for (const pick of picks) {
    const obr = ownershipByRole[pick.teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
    if (pick.role === "CINDERELLA") {
      cinderellaExposure += obr.cinderellaPct;
    } else if (pick.role === "VILLAIN") {
      villainExposure += obr.villainPct;
    }
  }

  // Normalize: each role appears 2x per member (2 heroes, 2 villains, 2 cinderellas)
  const totalCinderellaExposurePct = Math.round(
    (cinderellaExposure / Math.max(1, picks.filter((p) => p.role === "CINDERELLA").length)) *
      10
  ) / 10;
  const totalVillainExposurePct =
    Math.round(
      (villainExposure / Math.max(1, picks.filter((p) => p.role === "VILLAIN").length)) * 10
    ) / 10;

  // High seed (1–4) risk: avg ownership on those picks
  let heroExp = 0;
  let villainExp = 0;
  let cinderExp = 0;
  const highSeedTeams = new Set<string>();
  for (const pick of highSeedPicks) {
    highSeedTeams.add(pick.teamId);
    const obr = ownershipByRole[pick.teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
    if (pick.role === "HERO") heroExp += obr.heroPct;
    else if (pick.role === "VILLAIN") villainExp += obr.villainPct;
    else cinderExp += obr.cinderellaPct;
  }
  const n = highSeedPicks.length;
  const highSeedTeamCount = highSeedTeams.size;

  return {
    totalCinderellaExposurePct: Math.min(100, totalCinderellaExposurePct),
    totalVillainExposurePct: Math.min(100, totalVillainExposurePct),
    highSeedRiskSummary: {
      heroExposurePct: n > 0 ? Math.round((heroExp / n) * 10) / 10 : 0,
      villainExposurePct: n > 0 ? Math.round((villainExp / n) * 10) / 10 : 0,
      cinderellaExposurePct: n > 0 ? Math.round((cinderExp / n) * 10) / 10 : 0,
      highSeedTeamCount,
    },
  };
}
