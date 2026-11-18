import { test, expect } from '@playwright/test'

const linha = (page, chave) => page.locator(`.controle[data-chave="${chave}"]`)

test.beforeEach(async ({ page }) => {
  page.erros = []
  page.on('console', m => m.type() === 'error' && page.erros.push(m.text()))
  page.on('pageerror', e => page.erros.push(e.message))
  await page.goto('e2e/controle.html')
})

test('foco no range abre o popover com atual, fantasmas, régua e escala', async ({ page }) => {
  await linha(page, 'inclinacao').locator('input').focus()
  const pop = page.locator('#previa-viva')
  await expect(pop).toBeVisible()
  expect(await pop.locator('path').count()).toBeGreaterThanOrEqual(3)
  await expect(pop).toContainText(/[−-]30/)
  await expect(pop).toContainText('30 °')
  await expect(pop).toContainText('padrão')
  await expect(pop).toContainText('10 mm')
})

test('mudar o range atualiza output e grava', async ({ page }) => {
  const r = linha(page, 'inclinacao')
  await r.locator('input').fill('10')
  await expect(r.locator('output')).toHaveText('10 °')
  expect(await page.evaluate(() => window.gravados)).toContainEqual(['inclinacao', 10])
  await r.locator('input').press('ArrowRight')
  await expect(r.locator('output')).toHaveText('10,5 °')
})

test('mouse em dois controles deixa um único popover', async ({ page }) => {
  await linha(page, 'inclinacao').hover()
  await linha(page, 'colunas').hover()
  expect(await page.locator('[popover]').count()).toBe(1)
})

test('Escape fecha', async ({ page }) => {
  await linha(page, 'inclinacao').locator('input').focus()
  await expect(page.locator('#previa-viva:popover-open')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('#previa-viva:popover-open')).toHaveCount(0)
})

test('select abre com uma miniatura por opção', async ({ page }) => {
  await linha(page, 'estilo').locator('select').focus()
  await expect(page.locator('#previa-viva figure')).toHaveCount(3)
})

test('previa que lança não gera erro e mantém rótulo e ajuda', async ({ page }) => {
  await linha(page, 'quebra').locator('input').focus()
  const pop = page.locator('#previa-viva')
  await expect(pop).toContainText('quebrada')
  await expect(pop).toContainText('Esta prévia lança.')
  expect(await pop.locator('path').count()).toBe(0)
  expect(page.erros).toEqual([])
})

test('a 375 px o popover cabe na viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await linha(page, 'inclinacao').locator('input').focus()
  const pop = page.locator('#previa-viva')
  await expect(pop).toBeVisible()
  const b = await pop.boundingBox()
  expect(b.x).toBeGreaterThanOrEqual(0)
  expect(b.y).toBeGreaterThanOrEqual(0)
  expect(b.x + b.width).toBeLessThanOrEqual(375)
  expect(b.y + b.height).toBeLessThanOrEqual(812)
})

test('Básico esconde Salvar JSON; Avançado mostra; "?" com nome e fonte da mão com prévia', async ({ page }) => {
  await page.goto('index.html#carta')
  await page.locator('[data-chave="base"] select').first().focus()
  await expect(page.locator('#previa-viva figure')).toHaveCount(1)
  const salvar = page.getByRole('button', { name: 'Salvar JSON' })
  await expect(salvar).toBeHidden()
  await expect(page.getByRole('button', { name: 'Ajuda: Nome' })).toBeVisible()
  await page.getByLabel('Avançado').check()
  await expect(salvar).toBeVisible()
  await page.getByLabel('Básico').check()
  expect(page.erros).toEqual([])
})
