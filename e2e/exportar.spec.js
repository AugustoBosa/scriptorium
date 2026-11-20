import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const TEXTO = 'Caro {_viajante_},\n\nO vento cobre o vale e o moinho espera por você.'

test.beforeEach(async ({ page }) => {
  await page.goto('index.html#carta')
  // troca o texto da carta pelo de teste (o textarea é o que contém o texto padrão; o grupo "Texto" começa fechado)
  await page.getByText('Texto', { exact: true }).click()
  const idx = await page.$$eval('#painel textarea', ts => ts.findIndex(t => t.value.includes('Tinta ferrogálica')))
  await page.locator('#painel textarea').nth(idx).fill(TEXTO)
  await expect(page.getByRole('combobox', { name: 'Camada', exact: true })).toBeVisible()
})

const baixar = async (page, nome) => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: nome, exact: true }).click()])
  return { nome: dl.suggestedFilename(), texto: await readFile(await dl.path(), 'utf8') }
}

test('camada "notas" baixa só o grupo de notas em carta-p1-notas.svg', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Camada', exact: true }).selectOption('notas')
  const { nome, texto } = await baixar(page, 'Baixar SVG')
  expect(nome).toBe('carta-p1-notas.svg')
  expect(texto).toContain('data-camada="notas"')
  expect(texto).not.toContain('data-camada="texto"')
})

test('camada "todas" baixa os dois grupos em carta-p1.svg', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: 'Camada', exact: true })).toHaveValue('todas')
  const { nome, texto } = await baixar(page, 'Baixar SVG')
  expect(nome).toBe('carta-p1.svg')
  expect(texto).toContain('data-camada="texto"')
  expect(texto).toContain('data-camada="notas"')
})

test('G-code por camada traz só o bloco da camada escolhida', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Camada', exact: true }).selectOption('notas')
  const { nome, texto } = await baixar(page, 'Baixar G-code')
  expect(nome).toBe('carta-p1-notas.gcode')
  expect(texto).toContain('; camada notas')
  expect(texto).not.toContain('; camada texto')
})
