import { defineConfig, devices } from '@playwright/test'
import { API_URL, WEB_URL, configurarAmbiente } from './runtime.js'

configurarAmbiente()

export default defineConfig({
  testDir: './tests',
  outputDir: '../tmp/e2e-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: WEB_URL,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: [
    {
      command: 'node server.js',
      url: API_URL + '/health',
      reuseExistingServer: false,
      timeout: 30000,
      env: { ...process.env },
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180 --strictPort',
      cwd: '../frontend',
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 30000,
      env: { VITE_API_URL: API_URL },
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})
