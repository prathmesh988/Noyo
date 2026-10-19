import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Keep sequential for deterministic realtime multi-role workflows
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/playwright-results.json' }],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Mobile Viewport (iPhone 14 / standard Flutter WebView viewport)
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    geolocation: { latitude: 18.5204, longitude: 73.8567 },
    permissions: ['geolocation'],
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NoyoFlutterApp/1.0',
    actionTimeout: 15000,
    navigationTimeout: 20000
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: process.env.HEADED ? ['--auto-open-devtools-for-tabs'] : [],
          slowMo: process.env.HEADED ? 150 : 0
        }
      }
    },
    {
      name: 'webkit-mobile',
      use: {
        browserName: 'webkit'
      }
    }
  ]
});
