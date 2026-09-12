import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const remote = process.env.FACTORY_UI_URL;
const port = Number(process.env.FACTORY_UI_PORT || 8121);
const report = process.env.FACTORY_UI_REPORT || 'test-results/ui';
export default defineConfig({
  testDir: './tests/ui', timeout: 30000, expect: { timeout: 7000 }, retries: 0,
  workers: 2, forbidOnly: !!process.env.CI,
  outputDir: resolve(report, 'artifacts'),
  reporter: [['list'], ['json', { outputFile: resolve(report, 'results.json') }],
    ['junit', { outputFile: resolve(report, 'junit.xml') }], ['html', { outputFolder: resolve(report, 'html'), open: 'never' }]],
  use: { baseURL: remote || `http://127.0.0.1:${port}`, serviceWorkers: 'block',
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: remote ? undefined : { command: `${process.env.FACTORY_PYTHON || '.venv/bin/python'} -m uvicorn app.main:app --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/health`, reuseExistingServer: false, timeout: 20000 },
});
