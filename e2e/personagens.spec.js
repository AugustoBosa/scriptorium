import { test, expect } from '@playwright/test'

const mao = (extra = {}) => ({ base: [{ fonte: 'EMSDelight', peso: 1 }], inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, seed: 1, ...extra })
const pers = (nome) => ({ nome, mao: mao(), variacoes: { normal: {} } })

async function abrir(page, salvos = {}) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('semear')) { localStorage.setItem('semear', '1'); if (Object.keys(s).length) localStorage.setItem('writer.personagens', JSON.stringify(s)) }
  }, salvos)
  await page.goto('index.html#personagens')
  await expect(page.locator('#vista-personagens .pers-folha svg path').first()).toBeAttached()
  return page.locator('#vista-personagens')
}

test('criar: Novo, nome e Salvar na galeria', async ({ page }) => {
  const v = await abrir(page)
  await v.getByRole('button', { name: 'Novo', exact: true }).click()
  await v.getByLabel('Nome', { exact: true }).fill('Elara')
  await v.getByRole('button', { name: 'Salvar na galeria' }).click()
  await expect(v.locator('.pers-cartao')).toHaveCount(1)
  await expect(v.getByRole('heading', { name: 'Galeria (1)' })).toBeVisible()
  await expect(v.locator('.pers-cartao .marca')).toHaveText('em uso')
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('writer.personagens'))))).toEqual(['Elara'])
})

test('duplicar, renomear e excluir', async ({ page }) => {
  const v = await abrir(page, { Elara: pers('Elara') })
  await v.getByRole('button', { name: 'Duplicar Elara' }).click()
  await expect(v.getByRole('button', { name: 'Usar Elara (cópia)' })).toBeVisible()

  page.once('dialog', (d) => d.accept('Bram'))
  await v.getByRole('button', { name: 'Renomear Elara (cópia)' }).click()
  await expect(v.getByRole('button', { name: 'Usar Bram' })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writer.personagens')).Bram.nome)).toBe('Bram')

  page.once('dialog', (d) => d.accept('Elara'))
  await v.getByRole('button', { name: 'Renomear Bram' }).click()
  await expect(v.locator('.pers-mesa .erro')).toContainText('Erro: já existe um personagem com esse nome.')

  page.once('dialog', (d) => { expect(d.message()).toContain('Excluir "Bram"'); d.accept() })
  await v.getByRole('button', { name: 'Excluir Bram' }).click()
  await expect(v.locator('.pers-cartao')).toHaveCount(1)
})

test('importar JSON válido entra na galeria; inválido mostra erro', async ({ page }) => {
  const v = await abrir(page, { Elara: pers('Elara') })
  const arq = (o) => ({ name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(o)) })
  await v.locator('input[type=file]').setInputFiles(arq(pers('Elara')))
  await expect(v.getByRole('button', { name: 'Usar Elara 2' })).toBeVisible()
  await v.locator('input[type=file]').setInputFiles(arq({ nome: 'Ruim' }))
  await expect(v.locator('.pers-mesa .erro')).toContainText('Erro:')
  await expect(v.locator('.pers-cartao')).toHaveCount(2)
})

test('exportar baixa um .json', async ({ page }) => {
  const v = await abrir(page, { Elara: pers('Elara') })
  const [dl] = await Promise.all([page.waitForEvent('download'), v.getByRole('button', { name: 'Exportar Elara' }).click()])
  expect(dl.suggestedFilename()).toBe('elara.json')
})

test('Usar e ir à Carta: o painel mostra o nome escolhido', async ({ page }) => {
  const v = await abrir(page, { Elara: pers('Elara'), Bram: pers('Bram') })
  await v.getByRole('button', { name: 'Usar Bram' }).click()
  await expect(v.getByLabel('Nome', { exact: true })).toHaveValue('Bram')
  await page.evaluate(() => { location.hash = '#carta' })
  await expect(page.locator('#painel select#p-personagem')).toHaveValue('Bram')
  await expect(page.locator('#painel [data-chave="espacamento"]')).toHaveCount(0) // ajuste da mão só na aba Personagens
})

test('um slider muda writer.personagem; sem Salvar JSON na aba', async ({ page }) => {
  const v = await abrir(page, { Elara: pers('Elara') })
  await expect(v.getByRole('button', { name: 'Salvar JSON' })).toHaveCount(0)
  const antes = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('writer.personagem'))))
  await v.locator('.pers-editor summary', { hasText: /^Identidade$/ }).click()
  const slider = v.locator('.pers-editor [data-chave="espacamento"] input[type=range]')
  await slider.focus()
  await slider.press('ArrowRight')
  await expect.poll(() => page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('writer.personagem'))))).not.toBe(antes)
})
