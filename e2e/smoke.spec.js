import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // determinismo: sem rede para a fonte web
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }))
})

test('index.html abre sem erro de console e com prévia', async ({ page }) => {
  const erros = []
  page.on('console', m => m.type() === 'error' && erros.push(m.text()))
  page.on('pageerror', e => erros.push(e.message))
  await page.goto('index.html')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#previa svg path').first()).toBeAttached()
  expect(erros).toEqual([])
})

test('grimorio.html redireciona para index.html#grimorio', async ({ page }) => {
  await page.goto('grimorio.html')
  await page.waitForURL(/index\.html#grimorio/)
})

test('hash inválido cai em #carta', async ({ page }) => {
  await page.goto('index.html#xyz')
  await page.waitForURL(/#carta$/)
})

test('personagem salvo aparece no select de salvos', async ({ page }) => {
  await page.addInitScript(() => {
    const p = { nome: 'Teste', mao: { base: [{ fonte: 'EMSDelight', peso: 1 }], inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, seed: 1 }, variacoes: { normal: {} } }
    localStorage.setItem('writer.personagens', JSON.stringify({ Teste: p }))
  })
  await page.goto('index.html')
  await expect(page.locator('#painel option', { hasText: 'Teste' }).first()).toBeAttached()
})

test('Avançado mostra parâmetros avançados; Básico os esconde', async ({ page }) => {
  await page.goto('index.html')
  const esp = page.locator('[data-chave="espacamento"]')
  await expect(esp).toBeHidden()
  await page.getByLabel('Avançado').check()
  await expect(esp).toBeVisible()
  await page.getByLabel('Básico').check()
  await expect(esp).toBeHidden()
})
