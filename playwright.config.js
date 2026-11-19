import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:8765/' },
  webServer: { command: 'npm run dev', url: 'http://localhost:8765/', reuseExistingServer: true },
  projects: [
    { name: 'claro', use: { colorScheme: 'light' } },
    // tema escuro só muda a aparência: roda só as capturas/contraste, não repete a lógica
    { name: 'vela', use: { colorScheme: 'dark' }, testMatch: 'visual.spec.js' },
  ],
})
