import { test, expect } from '@playwright/test'

const secao = (page, titulo) => page.locator('#grupos details:not([hidden])', { has: page.locator('summary', { hasText: new RegExp(`^${titulo}$`) }) }).evaluate((d) => { d.open = true })

test('símbolos: trocar o modelo muda a folha-chave e fica salvo no personagem', async ({ page }) => {
  test.skip(!(await (await page.request.get('dados/magias.json')).ok()), 'sem dados/magias.json nesta cópia')
  await page.goto('index.html#simbolos')
  await page.waitForSelector('#previa g[data-camada="sigilo"] path')
  const antes = await page.locator('#previa g[data-camada="sigilo"]').innerHTML()
  await secao(page, 'Sistema')
  await page.locator('#grupos details[open] select').first().selectOption('colar')
  await expect.poll(() => page.locator('#previa g[data-camada="sigilo"]').innerHTML()).not.toBe(antes)
  await expect(page.locator('#previa g[data-camada="legendas"] path').first()).toBeAttached()
  const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('writer.personagem')).personagem.simbolos.preset)
  expect(salvo).toBe('colar')

  // um código editado: trocar o desenho do nível muda a folha de novo
  const colar = await page.locator('#previa g[data-camada="sigilo"]').innerHTML()
  await secao(page, 'Códigos')
  await page.locator('.codigos details').first().evaluate((d) => { d.open = true })
  await page.locator('.codigos details[open] select').nth(1).selectOption('lados')
  await expect.poll(() => page.locator('#previa g[data-camada="sigilo"]').innerHTML()).not.toBe(colar)
})
