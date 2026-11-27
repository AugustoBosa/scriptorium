import { test, expect } from '@playwright/test'

// Porta-caneta de troca: a folga da ponta sobe o mínimo da letra (src/maquina/folga.js); a Mega S sem ele não tem limite.
// Nas oficinas o tamanho é do personagem; o material só tem a escala, que é onde o limite aparece.
const perfil = (page, i) => page.locator('[data-chave=perfil] select').evaluate((s, v) => { s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })) }, String(i))

test('perfil com porta-caneta limita a escala da letra e avisa', async ({ page }) => {
  await page.goto('index.html#carta')
  await page.waitForSelector('#previa svg')
  const nota = page.locator('[data-chave=escala] .controle-nota').first(), entrada = page.locator('[data-chave=escala] input').first()
  await expect(nota).toBeHidden()
  await perfil(page, 2) // Mega S + porta-caneta no lado (o A5 em pé cabe na janela)
  await expect(nota).toContainText('folga do porta-caneta')
  await expect(nota).toHaveClass(/abaixo/) // escala 1 com a letra padrão (6 mm) fica abaixo do mínimo
  await expect(page.locator('span.erro').first()).toContainText('folga do porta-caneta')
  await entrada.evaluate((e) => { e.value = '0.5'; e.dispatchEvent(new Event('input', { bubbles: true })) })
  expect(Number(await entrada.inputValue())).toBeGreaterThan(1) // a escala não desce abaixo do mínimo
  await perfil(page, 0) // Mega S sem porta-caneta
  await expect(nota).toBeHidden()
})

test('a máquina escolhida vale no editor de personagem: o tamanho mostra o mínimo da folga', async ({ page }) => {
  await page.goto('index.html#carta')
  await page.waitForSelector('#previa svg')
  await perfil(page, 2) // Mega S + porta-caneta no lado: fica lembrada (writer.maquina)
  await page.locator('nav.oficinas a[href="#personagens"]').click()
  const ed = page.locator('.pers-editor')
  await ed.locator('summary', { hasText: /^Tamanho e linhas$/ }).click()
  await expect(ed.locator('[data-chave=tamanho] .controle-nota')).toContainText('folga do porta-caneta')
  await page.reload() // depois de recarregar a oficina abre com a mesma máquina
  await page.goto('index.html#carta')
  await page.waitForSelector('#previa svg')
  await expect(page.locator('[data-chave=escala] .controle-nota').first()).toContainText('folga do porta-caneta')
})
