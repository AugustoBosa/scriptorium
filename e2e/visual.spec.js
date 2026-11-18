import { test, expect } from '@playwright/test'

const OFICINAS = ['carta', 'scroll', 'grimorio', 'livro', 'sigilos']

async function abrir(page, id) {
  await page.goto('index.html#' + id)
  await page.waitForSelector(['inicio', 'personagens'].includes(id) ? '.pagina:not([hidden]) svg' : '#previa svg')
  await page.evaluate(() => document.fonts.ready)
}

async function foto(page, testInfo, nome, fullPage = false) {
  const path = testInfo.outputPath(nome + '.png')
  await page.screenshot({ fullPage, path })
  await testInfo.attach(nome, { path, contentType: 'image/png' })
}

for (const id of OFICINAS) {
  test(`captura ${id}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await abrir(page, id)
    await foto(page, testInfo, id)
  })
}

const SALVOS = () => {
  const m = { base: [{ fonte: 'EMSDelight', peso: 1 }], inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, seed: 1 }
  localStorage.setItem('writer.personagens', JSON.stringify({ Elara: { nome: 'Elara', mao: m, variacoes: { normal: {} } }, Bram: { nome: 'Bram', mao: { ...m, seed: 7 }, variacoes: { normal: {} } } }))
}

test('captura inicio', async ({ page }, testInfo) => {
  await page.addInitScript(SALVOS)
  await page.setViewportSize({ width: 1280, height: 900 })
  await abrir(page, 'inicio')
  await foto(page, testInfo, 'inicio')
})

test('captura inicio-mobile', async ({ page }, testInfo) => {
  await page.addInitScript(SALVOS)
  await page.setViewportSize({ width: 375, height: 812 })
  await abrir(page, 'inicio')
  await foto(page, testInfo, 'inicio-mobile', true)
})

test('captura personagens', async ({ page }, testInfo) => {
  await page.addInitScript(SALVOS)
  await page.setViewportSize({ width: 1280, height: 900 })
  await abrir(page, 'personagens')
  await foto(page, testInfo, 'personagens')
})

test('captura avançado com popover aberto', async ({ page }, testInfo) => {
  await abrir(page, 'carta')
  await page.getByLabel('Avançado').check()
  await page.locator('#grupos input[type=range]:visible').first().focus()
  await page.waitForSelector('#previa-viva:popover-open')
  await foto(page, testInfo, 'avancado-popover') // sem fullPage: resize fecha o popover
  await expect(page.locator(':popover-open')).toHaveCount(1)
  expect(await page.locator('#previa-viva path').count()).toBeGreaterThanOrEqual(3)
  await expect(page.locator('#previa-viva .pv-padrao-txt')).toBeVisible()
  await expect(page.locator('#previa-viva .pv-padrao-txt')).toContainText('padrão')
})

test('captura em 375x812', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await abrir(page, 'carta')
  await foto(page, testInfo, 'mobile', true)
})

// Contraste WCAG 2.x calculado dentro da página (sem lib).
function medir() {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number)
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const visivel = el => !el.closest('[hidden], .so-leitor') && el.getClientRects().length > 0
  const fundo = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) === 1) return c } return [255, 255, 255] }
  const falhas = []
  const texto = ['h1', 'nav.oficinas a', 'summary', '.controle label', '.controle output', 'button', 'select', '#pag-info', '#avisos li', 'h3', '.rotulo', 'label', '#previa-viva .pv-ajuda', '.pagina h2', '.pagina p', '.pagina a', '.pagina .marca']
  for (const sel of texto) for (const el of document.querySelectorAll(sel)) {
    if (!visivel(el)) continue
    const r = razao(rgb(getComputedStyle(el).color), fundo(el))
    if (r < 4.5) falhas.push(`${sel}: ${r.toFixed(2)} (texto)`)
  }
  for (const sel of ['select', 'input[type=number]', 'textarea', 'button']) for (const el of document.querySelectorAll(sel)) {
    if (!visivel(el)) continue
    const r = razao(rgb(getComputedStyle(el).borderTopColor), fundo(el.parentElement))
    if (r < 3) falhas.push(`${sel}: ${r.toFixed(2)} (borda)`)
  }
  const f = document.activeElement
  if (f && f !== document.body) {
    const r = razao(rgb(getComputedStyle(f).outlineColor), fundo(f.parentElement))
    if (r < 3) falhas.push(`foco ${f.tagName.toLowerCase()}: ${r.toFixed(2)} (outline)`)
  }
  return falhas
}

for (const id of OFICINAS) {
  test(`contraste AA em ${id}`, async ({ page }) => {
    await abrir(page, id)
    await page.getByLabel('Avançado').check()
    const campo = page.locator('#grupos input[type=range]:visible').first()
    if (await campo.count()) await campo.focus() // abre o popover para medir o texto de ajuda
    const falhas = await page.evaluate(medir) // com o popover aberto
    await page.keyboard.press('Tab')
    falhas.push(...(await page.evaluate(medir)).filter(f => f.includes('outline')))
    expect(falhas, falhas.join('\n')).toEqual([])
  })
}

for (const id of ['inicio', 'personagens']) for (const tema of ['claro', 'vela']) {
  test(`contraste AA em ${id} (${tema})`, async ({ page }) => {
    await page.addInitScript(SALVOS)
    await page.addInitScript(t => localStorage.setItem('writer.ui', JSON.stringify({ tema: t })), tema)
    await abrir(page, id)
    const falhas = await page.evaluate(medir)
    expect(falhas, falhas.join('\n')).toEqual([])
  })
}
