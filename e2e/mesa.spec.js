import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// M23: grupo "Mesa e folha" no painel (avançado), seletor "Página | Mesa" acima da prévia.
// perfil salvo com offsetX que empurra os traços do slot da direita para fora da janela (testes cujo título tem "offsetX")
async function abrir(page, perfil) {
  if (perfil) await page.addInitScript(p => localStorage.setItem('writer.perfil', JSON.stringify(p)), perfil)
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.goto('index.html#carta')
  await page.getByRole('radio', { name: 'Avançado' }).check().catch(() => {})
  await page.locator('#grupos details', { hasText: 'Papel e aparência' }).first().evaluate(d => { d.open = true })
  await page.getByRole('combobox', { name: 'formato', exact: true }).selectOption({ label: 'A6' })
  const grupo = page.locator('#grupos details', { hasText: 'Mesa e folha' })
  if (!(await grupo.getAttribute('open'))) await grupo.locator('summary').click()
  await page.getByRole('checkbox', { name: 'imposição na mesa' }).check()
  await page.getByRole('combobox', { name: 'folha', exact: true }).selectOption({ label: 'A4' })
  await page.getByRole('button', { name: 'Mesa', exact: true }).click()
}
test.beforeEach(({ page }) => {
  const t = test.info().title
  return abrir(page, t.includes('offsetX') ? { offsetX: 40, experimental: t.includes('experimental') } : undefined)
})

test('A6 em A4 mostra 4 slots e "Passada 1 de 2"; trocar a passada muda a instrução', async ({ page }) => {
  await expect(page.locator('.mesa svg [data-slot]')).toHaveCount(4)
  const sel = page.getByRole('combobox', { name: 'Passada' })
  await expect(sel.locator('option:checked')).toHaveText(/Passada 1 de 2/)
  const antes = await page.locator('.mesa-instrucao').textContent()
  expect(antes).toContain('Passada 1 de 2')
  await sel.selectOption({ index: 1 })
  const depois = await page.locator('.mesa-instrucao').textContent()
  expect(depois).toContain('Passada 2 de 2')
  expect(depois).not.toBe(antes)
})

test('configuração persiste em writer.mesa', async ({ page }) => {
  const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('writer.mesa')))
  expect(salvo).toMatchObject({ ligada: true, folha: 'A4' })
})

test('"Baixar todas as passadas" baixa carta-f1-pa1.gcode e carta-f1-pa2.gcode com a instrução no topo', async ({ page }) => {
  const baixados = []
  page.on('download', d => baixados.push(d))
  await page.getByRole('button', { name: 'Baixar todas as passadas', exact: true }).click()
  await expect.poll(() => baixados.length).toBe(2)
  expect(baixados.map(d => d.suggestedFilename()).sort()).toEqual(['carta-f1-pa1.gcode', 'carta-f1-pa2.gcode'])
  const texto = await readFile(await baixados[0].path(), 'utf8')
  expect(texto.startsWith('; Passada')).toBe(true)
})

test('modo "um por página" baixa um arquivo por slot com página', async ({ page }) => {
  await page.getByRole('combobox', { name: 'arquivos', exact: true }).selectOption({ label: 'um por página' })
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar todas as passadas', exact: true }).click()])
  expect(dl.suggestedFilename()).toMatch(/^carta-p1-f1-pa[12]\.gcode$/) // a carta tem 1 página: só o slot dela gera arquivo
})

test('offsetX que empurra traço para fora: aviso visível na Mega S, e o arquivo ainda sai', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Passada' }).selectOption({ index: 1 }) // a carta é a página 1: está no slot que a passada 2 alcança
  await expect(page.locator('.mesa .mesa-erro')).toContainText('fora da janela')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar esta passada', exact: true }).click()])
  expect(dl.suggestedFilename()).toBe('carta-f1-pa2.gcode')
  await expect(page.locator('.mesa .mesa-erro')).toContainText('fora da janela')
})

test('offsetX com perfil experimental: traço fora da janela: erro e nenhum arquivo', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Passada' }).selectOption({ index: 1 }) // a carta é a página 1: está no slot que a passada 2 alcança
  await expect(page.locator('.mesa .mesa-erro')).toHaveText('Perfil experimental: há traços fora da janela da máquina.')
  let baixou = false
  page.on('download', () => { baixou = true })
  await page.getByRole('button', { name: 'Baixar todas as passadas', exact: true }).click()
  await page.waitForTimeout(500)
  expect(baixou).toBe(false)
  await expect(page.locator('.mesa .mesa-erro')).toHaveText('Perfil experimental: há traços fora da janela da máquina.')
})
