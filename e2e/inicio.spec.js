import { test, expect } from '@playwright/test'

const mao = { base: [{ fonte: 'EMSDelight', peso: 1 }], inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, seed: 1 }
const pers = (nome) => ({ nome, mao, variacoes: { normal: {} } })

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }))
})

test('sem hash vai para #inicio com 5 cartões de oficina com miniatura', async ({ page }) => {
  const erros = []
  page.on('console', m => m.type() === 'error' && erros.push(m.text()))
  page.on('pageerror', e => erros.push(e.message))
  await page.goto('index.html')
  await page.waitForURL(/#inicio$/)
  const cartoes = page.locator('#vista-inicio .grade').first().locator('a.cartao')
  await expect(cartoes).toHaveCount(5)
  for (let i = 0; i < 5; i++) await expect(cartoes.nth(i).locator('svg path').first()).toBeAttached()
  expect(erros).toEqual([])
})

for (const id of ['carta', 'scroll', 'grimorio', 'livro', 'sigilos']) {
  test(`cartão ${id} leva a #${id}`, async ({ page }) => {
    await page.goto('index.html#inicio')
    await page.locator(`#vista-inicio a.cartao[href="#${id}"]`).click()
    await page.waitForURL(new RegExp(`#${id}$`))
    await expect(page.locator('#previa svg').first()).toBeAttached()
  })
}

test.describe('com salvos', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((d) => {
      localStorage.setItem('writer.personagens', JSON.stringify({ Elara: d.e, Bram: d.b }))
      localStorage.setItem('writer.personagem', JSON.stringify({ personagem: d.e, variacao: 'normal' }))
    }, { e: pers('Elara'), b: pers('Bram') })
    await page.goto('index.html#inicio')
  })

  test('Usar Bram muda a mão atual', async ({ page }) => {
    await expect(page.getByText('Mão atual: Elara')).toBeVisible()
    await page.getByRole('button', { name: 'Usar Bram' }).click()
    await expect(page.getByText('Mão atual: Bram')).toBeVisible()
  })

  test('Editar Bram vai para #personagens', async ({ page }) => {
    await page.getByRole('button', { name: 'Editar Bram' }).click()
    await page.waitForURL(/#personagens$/)
  })
})

test('sem salvos mostra a mensagem', async ({ page }) => {
  await page.goto('index.html#inicio')
  await expect(page.getByText('Nenhum personagem salvo ainda.')).toBeVisible()
})
