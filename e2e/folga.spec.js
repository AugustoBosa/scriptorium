import { test, expect } from '@playwright/test'

// Porta-caneta de troca: a folga da ponta sobe o mínimo do tamanho da letra (src/maquina/folga.js); a Mega S sem ele não tem limite.
const perfil = (page, i) => page.locator('[data-chave=perfil] select').evaluate((s, v) => { s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })) }, String(i))

test('perfil com porta-caneta limita o tamanho da letra e avisa', async ({ page }) => {
  await page.goto('index.html#carta')
  await page.waitForSelector('#previa svg')
  const nota = page.locator('[data-chave=tamanho] .controle-nota').first(), entrada = page.locator('[data-chave=tamanho] input').first()
  await expect(nota).toBeHidden()
  await perfil(page, 2) // Mega S + porta-caneta no lado (o A5 em pé cabe na janela)
  await expect(nota).toHaveText(/^mín\. \d+(,5)? mm pela folga do porta-caneta$/)
  await expect(nota).toHaveClass(/abaixo/) // tamanho padrão (6 mm) ficou abaixo do mínimo
  await expect(page.locator('span.erro').first()).toContainText('folga do porta-caneta')
  await entrada.evaluate((e) => { e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })) })
  const min = Number((await nota.textContent()).match(/[\d,]+/)[0].replace(',', '.'))
  await expect(entrada).toHaveValue(String(min)) // o slider não desce abaixo do mínimo
  await expect(nota).not.toHaveClass(/abaixo/)
  await perfil(page, 0) // Mega S sem porta-caneta
  await expect(nota).toBeHidden()
})
