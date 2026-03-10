/**
 * Centralized guide content. Edit here to update /guide.
 */

export type GuideRole = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  count: number;
};

export type GuideSection = {
  id: string;
  title: string;
  type: "paragraphs" | "roles" | "scoring" | "lifecycle" | "bullets" | "faq";
  content?: string[];
  roles?: GuideRole[];
  tableRows?: { round: string; hero: string; villain: string; cinderella: string }[];
  bullets?: string[];
  faq?: { q: string; a: string }[];
};

export const guideContent = {
  sections: [
    {
      id: "overview",
      title: "What is Chaos League?",
      type: "paragraphs" as const,
      content: [
        "Chaos League is a draft-based March Madness portfolio game. You don't fill out a bracket. You build a portfolio of teams across three roles: Hero, Villain, and Cinderella.",
        "You compete against other managers in your league. Points come from wins, rivalries between your picks, and strategic risk. The more leverage and chaos in your portfolio, the higher your potential score.",
      ],
    },
    {
      id: "portfolio",
      title: "Building Your Portfolio",
      type: "paragraphs" as const,
      content: [
        "During setup, each member selects 2 Heroes, 2 Villains, and 2 Cinderellas. All teams are available to everyone—no snake draft. Build your portfolio before the league locks or tip-off.",
      ],
    },
    {
      id: "roles",
      title: "The Three Roles",
      type: "roles" as const,
      roles: [
        {
          id: "hero",
          name: "Hero",
          tagline: "High seeds you expect to go far",
          description: "Points scale with wins. Same structure as Cinderella for win totals. You want these teams to advance.",
          count: 2,
        },
        {
          id: "villain",
          name: "Villain",
          tagline: "High seeds you're betting against",
          description: "You score when they lose early. The earlier the exit, the more points. R64 exit = 15 pts, R32 = 10, S16 = 7, E8 = 4, F4 = 2.",
          count: 2,
        },
        {
          id: "cinderella",
          name: "Cinderella",
          tagline: "Low seeds that could make a run",
          description: "Same win-point structure as Hero, plus milestone bonuses: Sweet 16 (+25), Elite 8 (+35), Final Four (+50).",
          count: 2,
        },
      ],
    },
    {
      id: "scoring",
      title: "Scoring System",
      type: "scoring" as const,
      content: [
        "Hero and Cinderella picks earn points per round win. Villain picks earn when the team is eliminated. Rivalry bonuses apply when your picks face each other (e.g. Hero beats Villain).",
        "Championship bonus: Predict the championship game total points. Closest without going over wins the tiebreak. If both tie on total points, the tiebreaker determines rank.",
      ],
      tableRows: [
        { round: "1 win", hero: "1", villain: "—", cinderella: "1" },
        { round: "2 wins", hero: "2", villain: "—", cinderella: "2" },
        { round: "3 wins (S16)", hero: "4", villain: "—", cinderella: "4 + 25" },
        { round: "4 wins (E8)", hero: "8", villain: "—", cinderella: "8 + 35" },
        { round: "5 wins (F4)", hero: "16", villain: "—", cinderella: "16 + 50" },
        { round: "6 wins (Champ)", hero: "32", villain: "—", cinderella: "32" },
        { round: "Villain eliminated R64", hero: "—", villain: "15", cinderella: "—" },
        { round: "Villain eliminated R32", hero: "—", villain: "10", cinderella: "—" },
        { round: "Villain eliminated S16", hero: "—", villain: "7", cinderella: "—" },
        { round: "Villain eliminated E8", hero: "—", villain: "4", cinderella: "—" },
        { round: "Villain eliminated F4", hero: "—", villain: "2", cinderella: "—" },
      ],
    },
    {
      id: "lifecycle",
      title: "League Lifecycle",
      type: "lifecycle" as const,
      content: [
        "SETUP: Rosters are open. Build your portfolio and set your championship prediction.",
        "LOCKED: Rosters are frozen. League is waiting for tournament tip-off. Host or Beta Admin can force start if needed.",
        "LIVE: Tournament has started. Points update as games finish.",
        "COMPLETE: Tournament finished. Final standings locked.",
        "Auto-start: If a first-tip time is set, the league goes LIVE automatically 60 minutes before first tip.",
      ],
    },
    {
      id: "analytics",
      title: "Analytics & Strategy",
      type: "paragraphs" as const,
      content: [
        "Ownership heatmap shows who owns which teams across the league. High ownership on a Cinderella means less leverage if they pop.",
        "Leverage measures how much your portfolio stands to gain or lose from a single outcome. Diversified risk can reduce variance.",
        "Rivalries track when your picks face each other. Hero vs Villain matchups earn bonus points for the Hero owner.",
        "Momentum reflects round-over-round rank changes. Portfolio identity combines your role mix and team exposure.",
      ],
    },
    {
      id: "strategy",
      title: "Strategy Tips",
      type: "bullets" as const,
      bullets: [
        "Don't over-stack one region. Spread risk across the bracket.",
        "Diversify risk. All heroes in the same half could collide early.",
        "Consider ownership leverage. Low-owned Cinderellas can separate you.",
        "Late round equity matters. A champ Hero or deep Cinderella drives big points.",
      ],
    },
    {
      id: "faq",
      title: "FAQ",
      type: "faq" as const,
      faq: [
        {
          q: "Can I edit picks?",
          a: "Only during SETUP. Once the league is LOCKED or LIVE, your roster is frozen.",
        },
        {
          q: "What if I forget the tiebreaker?",
          a: "If you leave championship prediction blank, you'll lose any tiebreaker against someone who set one. Set it during setup.",
        },
        {
          q: "Can I join multiple leagues?",
          a: "Yes. Each league has its own Game PIN. Use My Leagues to switch between leagues on the same device.",
        },
        {
          q: "What happens if two players tie?",
          a: "Tiebreaker is predicted championship total points. Closest without going over wins. If still tied, closest absolute difference. Final tiebreak is display name (alphabetical).",
        },
      ],
    },
  ] as GuideSection[],
};
