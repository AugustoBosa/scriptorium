import { test, expect } from '@playwright/test'

async function abrir(page, id) {
  await page.goto('index.html#' + id)
  await page.waitForSelector('#previa svg')
}

async function escrever(page, texto) {
  await page.locator('#grupos summary', { hasText: /^Texto$/ }).click()
  await page.locator('#painel textarea:visible').first().fill(texto)
}

test('carta: marcação vira camada de notas e não aparece como texto', async ({ page }) => {
  await abrir(page, 'carta')
  await page.locator('#painel .controle[data-chave="tipo"] select').selectOption({ label: 'anotação' })
  await escrever(page, 'Caro viajante, o vento {nota: cuidado com o vento} cobre {_vale_} e o moinho espera {~vc~>você} ainda hoje.')
  await expect(page.locator('#previa g[data-camada="texto"]')).toBeAttached()
  await expect(page.locator('#previa g[data-camada="notas"] path').first()).toBeAttached()
  await expect(page.locator('#avisos')).not.toContainText('{')
  // o texto desenhado é limpo: 'nota' só existe como notas, nunca com chave literal
  expect(await page.locator('#previa').innerHTML()).not.toContain('{')
})

test('livro: texto longo gera 3 páginas ou mais', async ({ page }) => {
  await abrir(page, 'livro')
  await escrever(page, 'Era uma vez um escriba paciente que copiava palavras com uma caneta fina. '.repeat(60))
  await expect(page.locator('#pag-info')).toHaveText(/Página 1 de ([3-9]|\d\d)/)
  await expect(page.locator('#previa g[data-camada="paginacao"]')).toBeAttached()
})

test('sigilos: 4 frases desenham 4 sigilos ou mais com legendas', async ({ page }) => {
  await abrir(page, 'sigilos')
  await page.locator('#frases').fill('um\ndois\ntrês\nquatro')
  await expect.poll(() => page.locator('#previa g[data-camada="sigilos"] path').count()).toBeGreaterThanOrEqual(4)
  await expect(page.locator('#previa g[data-camada="legendas"] path').first()).toBeAttached()
})

test('trocar de oficina não perde a variação do grimório', async ({ page }) => {
  await abrir(page, 'magias')
  await page.locator('#grupos summary', { hasText: 'Escrita' }).click()
  const sel = page.locator('#grupos label', { hasText: /^Variação/ }).locator('select')
  const opcoes = await sel.locator('option').allTextContents()
  const atual = await sel.evaluate((s) => s.selectedOptions[0].textContent)
  const outra = opcoes.find((o) => o !== atual)
  test.skip(!outra, 'personagem sem variação para trocar')
  await sel.selectOption({ label: outra })
  await page.locator('nav.oficinas a[href="#carta"]').click()
  await expect(page.locator('#pag-info')).toBeVisible()
  await page.locator('nav.oficinas a[href="#magias"]').click()
  expect(await sel.evaluate((s) => s.selectedOptions[0].textContent)).toBe(outra)
})

test('sigilos: complexidade muda o SVG da prévia (tipo círculo)', async ({ page }) => {
  await abrir(page, 'sigilos')
  await page.locator('#painel .controle[data-chave="tipoSigilo"] select').selectOption({ label: 'círculo' })
  await page.locator('#grupos summary', { hasText: /^Tradição$/ }).click()
  const antes = await page.locator('#previa').innerHTML()
  await page.locator('#painel .controle[data-chave="complexidade"] input').fill('0.9')
  await expect.poll(() => page.locator('#previa').innerHTML()).not.toBe(antes)
})

test('livro: marcação da Carta não vira texto literal', async ({ page }) => {
  await abrir(page, 'livro')
  await escrever(page, 'O vento {nota: cuidado} cobre {_vale_} e o moinho.')
  expect(await page.locator('#previa').innerHTML()).not.toContain('{')
  await expect(page.locator('#avisos')).not.toContainText('{')
})
