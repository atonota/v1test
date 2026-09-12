import { test, expect } from '@playwright/test';

test('wide filter controls and refresh remain side by side', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const panel = page.locator('#filter-panel');
  await expect(panel).toHaveAttribute('data-profile', 'wide');
  const controls = await panel.locator('.filter-controls').boundingBox();
  const refresh = await page.getByRole('button', { name: 'Yenile', exact: true }).boundingBox();
  expect(controls).not.toBeNull(); expect(refresh).not.toBeNull();
  expect(refresh.x).toBeGreaterThanOrEqual(controls.x + controls.width);
  expect(Math.min(controls.y + controls.height, refresh.y + refresh.height))
    .toBeGreaterThan(Math.max(controls.y, refresh.y));
});
