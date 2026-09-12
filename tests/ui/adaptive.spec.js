import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('app/dist/delivery-manifest.json'));
const data = { updated_at: '2026-09-12T00:00:00Z', paused: false, credit_note: 'Raporlanan tokenlar; hesap kredisi bilinmiyor.',
  projects: [{ id: 'p1', name: 'Birinci proje', enabled: true }, { id: 'p2', name: 'İkinci proje', enabled: true }],
  jobs: [{ id: 'j1', project_key: 'p1', name: 'Birinci kontrol görevi', status: 'RUNNING', stage: 'review', agent_calls: 2, uncached_input_tokens: 1000, output_tokens: 200 },
    { id: 'j2', project_key: 'p2', name: 'İkinci kontrol görevi', status: 'ERROR', stage: 'code_green', agent_calls: 3, uncached_input_tokens: 2000, output_tokens: 400 }] };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/overview', route => route.fulfill({ json: structuredClone(data) }));
});

const widths = process.env.FACTORY_UI_SCOPE === 'full' ? [320, 390, 767, 768, 769, 1440] : [320, 1440];
for (const width of widths) test(`profile ${width}: production delivery, reflow, keyboard and accessibility`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const requests = [], errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const profile = width < 768 ? 'compact' : 'wide';
  await expect(page.locator('#filter-panel')).toHaveAttribute('data-profile', profile);
  await expect(page.getByText('Birinci kontrol görevi', { exact: true })).toBeVisible();
  // Real requests are observed, never blocked to manufacture isolation success.
  const files = requests.map(url => new URL(url).pathname.slice(1));
  const forbidden = Object.entries(graph.chunks).filter(([, item]) => item.profiles.some(p => p !== profile)).map(([file]) => file);
  expect(files.filter(file => forbidden.includes(file))).toEqual([]);
  expect(files).toContain(graph.profiles[profile]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  if (profile === 'compact') {
    const toggle = page.getByRole('button', { name: 'Filtreler', exact: true });
    await toggle.focus(); await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  await page.getByLabel('Proje', { exact: true }).selectOption({ label: 'Birinci proje' });
  await expect(page.getByText('İkinci kontrol görevi', { exact: true })).toHaveCount(0);
  const refresh = page.getByRole('button', { name: 'Yenile', exact: true });
  await refresh.focus(); await page.keyboard.press('Enter'); await expect(refresh).toBeFocused();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
  const resource = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ name: r.name, body: r.decodedBodySize })));
  const jsBytes = resource.filter(r => new URL(r.name).pathname.endsWith('.js')).reduce((sum, r) => sum + r.body, 0);
  const cssBytes = resource.filter(r => new URL(r.name).pathname.endsWith('.css')).reduce((sum, r) => sum + r.body, 0);
  expect(jsBytes).toBeLessThan(80 * 1024); expect(cssBytes).toBeLessThan(160 * 1024);
  await info.attach('delivery-evidence', { body: JSON.stringify({ profile, requests, jsBytes, cssBytes, automatedWcagOnly: true }), contentType: 'application/json' });
});

test('profile transitions preserve filter state and focus without duplicate fetching', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const requested = []; page.on('request', r => requested.push(new URL(r.url()).pathname.slice(1)));
  await page.goto('/'); await expect(page.locator('#filter-panel')).toHaveAttribute('data-profile', 'wide');
  const filter = page.getByLabel('Proje', { exact: true });
  await filter.selectOption('p1'); await filter.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#filter-panel')).toHaveAttribute('data-profile', 'compact');
  await expect(filter).toHaveValue('p1'); await expect(filter).toBeFocused();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#filter-panel')).toHaveAttribute('data-profile', 'wide');
  await expect(filter).toHaveValue('p1');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#filter-panel')).toHaveAttribute('data-profile', 'compact');
  for (const file of Object.values(graph.profiles)) expect(requested.filter(r => r === file)).toHaveLength(1);
});

test('empty, error and untrusted content remain correct', async ({ page }) => {
  await page.goto('/'); await expect(page.getByText('Birinci kontrol görevi', { exact: true })).toBeVisible();
  await page.route('**/api/overview', route => route.fulfill({ json: { ...data, jobs: [] } }));
  await page.getByRole('button', { name: 'Yenile', exact: true }).click();
  await expect(page.locator('#jobs article')).toHaveCount(0);
  await page.route('**/api/overview', route => route.fulfill({ status: 503, json: { detail: 'unavailable' } }));
  await page.getByRole('button', { name: 'Yenile', exact: true }).click();
  await expect(page.locator('#feedback')).toContainText('yüklenemedi');
  const payload = '<img src=x onerror="window.factoryXss=1">';
  await page.route('**/api/overview', route => route.fulfill({ json: { ...data, jobs: [{ ...data.jobs[0], name: payload }] } }));
  await page.getByRole('button', { name: 'Yenile', exact: true }).click();
  await expect(page.getByText(payload, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.factoryXss)).toBeUndefined();
});

test('unavailable enhancement retains usable baseline controls', async ({ page }) => {
  // A separate resilience test: this blocked request is not counted as isolation evidence.
  await page.route('**/' + graph.profiles.wide, route => route.abort());
  await page.goto('/');
  await expect(page.locator('#filter-panel')).toHaveAttribute('data-profile', 'baseline');
  await expect(page.getByLabel('Proje', { exact: true })).toBeVisible();
  await page.getByLabel('Proje', { exact: true }).selectOption('p1');
  await expect(page.getByText('İkinci kontrol görevi', { exact: true })).toHaveCount(0);
});

test('loading another profile does not contaminate the original visual presentation', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const panel = page.locator('#filter-panel');
  await expect(panel).toHaveAttribute('data-profile', 'compact');
  await expect(page.getByText('Birinci kontrol görevi', { exact: true })).toBeVisible();
  const initial = await panel.screenshot({ animations: 'disabled', caret: 'hide' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(panel).toHaveAttribute('data-profile', 'wide');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toHaveAttribute('data-profile', 'compact');
  const restored = await panel.screenshot({ animations: 'disabled', caret: 'hide' });
  await info.attach('compact-before', { body: initial, contentType: 'image/png' });
  await info.attach('compact-after-wide', { body: restored, contentType: 'image/png' });
  // Same browser/environment, actual pixel comparison; no automatic acceptance of changed baselines.
  expect(restored.equals(initial)).toBe(true);
});

test('cold and warm delivery remain usable with service-worker detection enabled', async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, serviceWorkers: 'allow', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route('**/api/overview', route => route.fulfill({ json: structuredClone(data) }));
  const passes = [];
  for (const phase of ['cold', 'warm']) {
    await page.goto('/');
    await expect(page.locator('#filter-panel')).toHaveAttribute('data-profile', 'compact');
    await expect(page.getByText('Birinci kontrol görevi', { exact: true })).toBeVisible();
    const registrations = await page.evaluate(async () => navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0);
    expect(registrations, 'A real SW requires its own controlled and uncontrolled profile contract').toBe(0);
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ path: new URL(r.name).pathname.slice(1), transfer: r.transferSize })));
    const inactive = Object.entries(graph.chunks).filter(([, chunk]) => chunk.profiles.includes('wide')).map(([file]) => file);
    expect(resources.filter(r => inactive.includes(r.path))).toEqual([]);
    passes.push({ phase, resources, serviceWorkers: registrations });
  }
  await info.attach('cold-warm-sw-evidence', { body: JSON.stringify(passes), contentType: 'application/json' });
  await context.close();
});
