import { test, expect } from '@playwright/test'

async function abrir(page, id) {
  await page.goto('index.html#' + id)
  await page.waitForSelector('#previa svg')
}

// Painel em acordeão: abrir uma seção fecha as outras
const secao = (page, titulo) => page.locator('#grupos details:not([hidden])', { has: page.locator('summary', { hasText: new RegExp(`^${titulo}$`) }) }).evaluate((d) => { d.open = true })

async function escrever(page, texto) {
  await secao(page, 'Texto')
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

test('trocar de oficina não perde a variação das magias', async ({ page }) => {
  await page.addInitScript(() => {
    const mao = { base: [{ fonte: 'EMSDelight', peso: 1 }], inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, seed: 1 }
    localStorage.setItem('writer.personagem', JSON.stringify({ personagem: { nome: 'Teste', mao, variacoes: { normal: {}, apressado: { pressa: 0.7 } } }, variacao: 'normal' }))
  })
  await abrir(page, 'magias')
  await secao(page, 'Personagem')
  const sel = page.locator('#grupos details:not([hidden]) select[id^="p-variacao"]')
  const opcoes = await sel.locator('option').allTextContents()
  const atual = await sel.evaluate((s) => s.selectedOptions[0].textContent)
  const outra = opcoes.find((o) => o !== atual)
  expect(outra).toBeTruthy()
  await sel.selectOption({ label: outra })
  await page.locator('#menu').click()
  await page.locator('nav.oficinas a[href="#carta"]').click()
  await expect(page.locator('#pag-info')).toBeVisible()
  await page.locator('#menu').click()
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

test('livro: nota do exemplo aparece na camada notas e o painel muda a posição dela no texto', async ({ page }) => {
  await abrir(page, 'livro')
  await expect.poll(() => page.locator('#previa g[data-camada="notas"] path').count()).toBeGreaterThan(0)
  await secao(page, 'Notas')
  const sel = page.locator('#grupos details:not([hidden]) .posicoes select').first()
  await sel.selectOption('esquerda')
  await expect.poll(() => page.locator('#painel textarea').evaluateAll((ts) => ts.some((t) => t.value.includes('{nota@esquerda:')))).toBe(true)
  await expect(page.locator('#previa .alca-nota').first()).toBeAttached()
})

test('livro: alça da nota anda pelo teclado e o foco volta para ela', async ({ page }) => {
  await abrir(page, 'livro')
  const alca = page.locator('#previa .alca-nota').first()
  await alca.focus()
  await page.keyboard.press('Shift+ArrowDown')
  await expect.poll(() => page.locator('#painel textarea').evaluateAll((ts) => ts.some((t) => /\{nota@[\d.]+,[\d.]+/.test(t.value)))).toBe(true)
  await expect(page.locator('#previa .alca-nota:focus')).toHaveCount(1)
  await expect(alca).toHaveCSS('touch-action', 'none')
})

test('livro: ângulo da nota no painel vira /graus no texto e as setas usam os controles de mão', async ({ page }) => {
  await abrir(page, 'livro')
  await secao(page, 'Notas')
  const ang = page.locator('#grupos details:not([hidden]) .posicao input[type=number]').first()
  await ang.fill('30')
  await ang.dispatchEvent('change')
  await expect.poll(() => page.locator('#painel textarea').evaluateAll((ts) => ts.some((t) => /\{nota@\/30:/.test(t.value)))).toBe(true)
  const notas = page.locator('#grupos details:not([hidden])', { has: page.locator('summary', { hasText: /^Notas$/ }) })
  for (const k of ['curva', 'irregular', 'ponta', 'inclinacao']) await expect(notas.locator(`.controle[data-chave="${k}"]`)).toBeVisible()
})
