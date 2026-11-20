import { test, expect } from '@playwright/test'

test('index.html abre sem erro de console e com prévia', async ({ page }) => {
  const erros = []
  page.on('console', m => m.type() === 'error' && erros.push(m.text()))
  page.on('pageerror', e => erros.push(e.message))
  await page.goto('index.html#carta')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#previa svg path').first()).toBeAttached()
  expect(erros).toEqual([])
})


test('hash inválido cai em #inicio', async ({ page }) => {
  await page.goto('index.html#xyz')
  await page.waitForURL(/#inicio$/)
})

test('personagem salvo aparece no select de salvos', async ({ page }) => {
  await page.addInitScript(() => {
    const p = { nome: 'Teste', mao: { base: [{ fonte: 'EMSDelight', peso: 1 }], inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, seed: 1 }, variacoes: { normal: {} } }
    localStorage.setItem('writer.personagens', JSON.stringify({ Teste: p }))
  })
  await page.goto('index.html#carta')
  await expect(page.locator('#painel option', { hasText: 'Teste' }).first()).toBeAttached()
})

test('só uma seção do painel fica aberta por vez', async ({ page }) => {
  await page.goto('index.html#carta')
  await page.waitForSelector('#previa svg')
  const abertas = page.locator('#grupos details:not([hidden])[open]')
  await expect(abertas).toHaveCount(1)
  await page.locator('#grupos summary', { hasText: /^Texto$/ }).click()
  await expect(abertas).toHaveCount(1)
  await expect(abertas.locator('summary')).toHaveText('Texto')
})

test('menu ☰: some na home, abre nas oficinas, marca a rota atual e fecha ao navegar', async ({ page }) => {
  await page.goto('index.html#inicio')
  await expect(page.locator('#menu')).toBeHidden()
  await page.goto('index.html#carta')
  await page.waitForSelector('#previa svg')
  const nav = page.getByRole('navigation', { name: 'Seções' })
  await expect(nav).toBeHidden()
  await page.locator('#menu').click()
  await expect(nav.getByRole('link', { name: 'Carta' })).toHaveAttribute('aria-current', 'page')
  await nav.getByRole('link', { name: 'Personagens' }).click()
  await page.waitForURL(/#personagens$/)
  await expect(nav).toBeHidden()
  await page.locator('#menu').click()
  await expect(nav.getByRole('link', { name: 'Personagens' })).toHaveAttribute('aria-current', 'page')
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
})

test('Básico na aba Personagens ainda mostra espaçamento', async ({ page }) => {
  await page.goto('index.html#personagens')
  await expect(page.locator('#vista-personagens [data-chave="espacamento"]').first()).toBeVisible()
})

for (const [antiga, porPagina] of [['scroll', true], ['grimorio', false]]) {
  test(`#${antiga} redireciona para #magias (uma por página: ${porPagina})`, async ({ page }) => {
    await page.goto('index.html#' + antiga)
    await page.waitForURL(/#magias$/)
    await expect(page.locator('#painel .controle[data-chave="porPagina"] input')).toBeChecked({ checked: porPagina })
  })
}
