import { test, expect } from '@playwright/test'

for (const pagina of ['index.html', 'grimorio.html']) {
  test(`${pagina} abre sem erro de console`, async ({ page }) => {
    const erros = []
    page.on('console', m => m.type() === 'error' && erros.push(m.text()))
    page.on('pageerror', e => erros.push(e.message))
    await page.goto(pagina)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#previa')).toBeAttached()
    expect(erros).toEqual([])
  })
}
