import { test, expect } from '@playwright/test'

async function abrir(page, id) {
  await page.goto('index.html#' + id)
  await page.waitForSelector('#previa svg')
}

async function escrever(page, texto) {
  const grupo = page.locator('#grupos details:not([hidden])', { has: page.locator('summary', { hasText: /^Texto$/ }) })
  if (!(await grupo.evaluate((d) => d.open))) await grupo.locator('summary').click()
  await page.locator('#painel textarea:visible').first().fill(texto)
}

const textoAtual = (page) => page.locator('#painel textarea').evaluateAll((ts) => ts.map((t) => t.value).join('|'))

test('trabalho da Carta continua depois de recarregar a página', async ({ page }) => {
  await abrir(page, 'carta')
  await escrever(page, 'texto que precisa ficar salvo')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('trabalho.escrita') ?? '')).toContain('texto que precisa ficar salvo')
  await page.reload()
  await page.waitForSelector('#previa svg')
  await expect.poll(() => textoAtual(page)).toContain('texto que precisa ficar salvo')
})

test('salvar na biblioteca, mudar o texto e reabrir o material', async ({ page }) => {
  await abrir(page, 'carta')
  await escrever(page, 'versão guardada na biblioteca')
  page.once('dialog', (d) => d.accept('Meu material'))
  await page.locator('#salvar-material').click()
  await expect(page.locator('#salvo')).toContainText('Meu material')
  await escrever(page, 'versão nova, não guardada')
  await page.goto('index.html#biblioteca')
  const cartao = page.locator('.bib-cartao', { hasText: 'Meu material' })
  await expect(cartao).toBeVisible()
  await cartao.getByRole('button', { name: 'Abrir Meu material' }).click()
  await page.waitForURL(/#carta$/)
  await expect.poll(() => textoAtual(page)).toContain('versão guardada na biblioteca')
  await page.goto('index.html#inicio')
  await expect(page.locator('#vista-inicio .material', { hasText: 'Meu material' })).toBeVisible()
})

test('magias importadas ficam guardadas no navegador', async ({ page }) => {
  await page.route('**/dados/magias.json', (r) => r.fulfill({ status: 404, body: '' }))
  await abrir(page, 'magias')
  const magias = [{ id: 'teste-1', nome: 'Magia de Teste', nivel: 1, escola: 'V', classes: ['Mago'], linhaNivel: 'Evocação de 1º nível', tempo: '1 ação', alcance: '9 m', comp: 'V', duracao: 'Instantânea', texto: 'Um teste.', resumo: 'Teste.' }]
  await page.locator('#painel input[type=file][accept=".json"]').first().setInputFiles({ name: 'magias.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(magias)) })
  const magiasAberto = () => page.locator('#grupos summary', { hasText: /^Magias$/ }).click()
  await magiasAberto()
  await expect(page.locator('#painel button', { hasText: 'Magia de Teste' })).toBeVisible()
  await page.reload()
  await page.waitForSelector('#previa svg')
  await magiasAberto()
  await expect(page.locator('#painel button', { hasText: 'Magia de Teste' })).toBeVisible()
})
