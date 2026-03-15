import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/*
Design audit checklist:
- spacing consistency
- CTA hierarchy
- safe-area padding
- vertical rhythm
- card sizing
- mobile overflow
- button alignment
- navigation consistency
*/

const appDir = path.resolve(process.cwd(), "app");
type RouteAudit = {
  name: string;
  route: string;
  sourcePath: string;
};

const routeAudits: RouteAudit[] = [
  { name: "home", route: "/", sourcePath: "page.tsx" },
  { name: "how-to-play", route: "/how-to-play", sourcePath: "how-to-play/page.tsx" },
  { name: "join", route: "/join", sourcePath: "join/page.tsx" },
  {
    name: "demo-dashboard",
    route: "/league/demo/dashboard",
    sourcePath: "league/[leagueId]/dashboard/page.tsx",
  },
  {
    name: "demo-standings",
    route: "/league/demo/standings",
    sourcePath: "league/[leagueId]/standings/page.tsx",
  },
  {
    name: "demo-games",
    route: "/league/demo/games",
    sourcePath: "league/[leagueId]/games/page.tsx",
  },
  {
    name: "demo-more",
    route: "/league/demo/more",
    sourcePath: "league/[leagueId]/more/page.tsx",
  },
  {
    name: "demo-war-room",
    route: "/league/demo/war-room",
    sourcePath: "league/[leagueId]/war-room/page.tsx",
  },
  {
    name: "demo-portfolio",
    route: "/league/demo/portfolio",
    sourcePath: "league/[leagueId]/portfolio/page.tsx",
  },
  {
    name: "demo-bracket",
    route: "/league/demo/bracket",
    sourcePath: "league/[leagueId]/bracket/page.tsx",
  },
];

function toProjectSlug(projectName: string) {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function withAuditMode(route: string) {
  const separator = route.includes("?") ? "&" : "?";
  return `${route}${separator}audit=1`;
}

async function stabilizePageForAudit(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `,
  });
}

test("reconnects returning user directly to the same league dashboard", async ({ page }) => {
  await page.goto("/league/demo/dashboard", { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/league\/[^/]+\/dashboard(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: /Chaos League Demo/i }),
  ).toBeVisible();

  const initialPathname = new URL(page.url()).pathname;

  await page.reload({ waitUntil: "networkidle" });

  await expect(page).toHaveURL(new RegExp(`${initialPathname.replace(/\//g, "\\/")}(?:\\?.*)?$`));
  await expect(page).not.toHaveURL(/\/join(?:\?|$)/);
  await expect(page).not.toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: /Chaos League Demo/i }),
  ).toBeVisible();
  await expect(page.getByText(/Enter your Game PIN/i)).toHaveCount(0);
});

for (const audit of routeAudits) {
  test(`${audit.name} design audit screenshot`, async ({ page }, testInfo) => {
    const sourceFile = path.join(appDir, audit.sourcePath);

    test.skip(!existsSync(sourceFile), `Route source not found for ${audit.route}`);

    await page.goto(withAuditMode(audit.route), { waitUntil: "networkidle" });
    await stabilizePageForAudit(page);
    await page.waitForLoadState("networkidle");

    const projectSlug = toProjectSlug(testInfo.project.name);
    const screenshotDir = path.join("test-results", "ui-audit", projectSlug);
    const screenshotPath = path.join(
      screenshotDir,
      `${audit.name}--${projectSlug}.png`,
    );

    mkdirSync(screenshotDir, { recursive: true });

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });

    testInfo.annotations.push({
      type: "screenshot",
      description: screenshotPath,
    });
  });
}
