import { expect, test } from "@playwright/test";

test("mobile bottom nav routes correctly and keeps Games inside More", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iPhone 14", "This navigation audit is scoped to the iPhone 14 project.");

  await page.goto("/league/demo/dashboard", { waitUntil: "networkidle" });

  const initialPath = new URL(page.url()).pathname;
  const leagueBase = initialPath.replace(/\/dashboard$/, "");
  const nav = page.getByRole("navigation", { name: /mobile league navigation/i });

  await expect(nav).toBeVisible();

  const navLabels = ["Home", "Standings", "My Team", "War Room", "More"] as const;
  await expect(nav.getByRole("link")).toHaveCount(navLabels.length);

  for (const label of navLabels) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }

  await expect(nav.getByRole("link", { name: "Games" })).toHaveCount(0);

  await nav.getByRole("link", { name: "Standings" }).click();
  await expect(page).toHaveURL(new RegExp(`${leagueBase.replace(/\//g, "\\/")}\\/standings(?:\\?.*)?$`));

  await nav.getByRole("link", { name: "My Team" }).click();
  await expect(page).toHaveURL(new RegExp(`${leagueBase.replace(/\//g, "\\/")}\\/portfolio(?:\\?.*)?$`));

  await nav.getByRole("link", { name: "War Room" }).click();
  await expect(page).toHaveURL(new RegExp(`${leagueBase.replace(/\//g, "\\/")}\\/war-room(?:\\?.*)?$`));

  await nav.getByRole("link", { name: "More" }).click();
  await expect(page).toHaveURL(new RegExp(`${leagueBase.replace(/\//g, "\\/")}\\/more(?:\\?.*)?$`));
  await expect(page.getByRole("heading", { name: /More From Chaos League/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Stay on Top of the Board/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Games/i })).toBeVisible();

  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(new RegExp(`${leagueBase.replace(/\//g, "\\/")}\\/dashboard(?:\\?.*)?$`));
  await expect(page.getByRole("heading", { name: /Chaos League Demo/i })).toBeVisible();
});
