const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'results/report.json' }]],
  outputDir: 'results/artifacts',
  use: {
    baseURL: 'http://127.0.0.1:8030',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.CRM_QA_CHROMIUM ? { executablePath: process.env.CRM_QA_CHROMIUM } : {},
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'movil', use: { ...devices['Pixel 7'], locale: 'es-DO' } },
  ],
  webServer: {
    command: 'python3 -m http.server 8030 --bind 127.0.0.1 --directory ../docs',
    url: 'http://127.0.0.1:8030',
    reuseExistingServer: false,
    timeout: 15000,
  },
});
