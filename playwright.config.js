import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4174/PosterCult/', viewport: { width: 1440, height: 1000 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4174/PosterCult/', env: { PORT: '4174', BASE_PATH: '/PosterCult' }, reuseExistingServer: false },
});
