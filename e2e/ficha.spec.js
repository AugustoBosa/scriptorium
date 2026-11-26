import { test, expect } from '@playwright/test'

const mao = (extra = {}) => ({ base: [{ fonte: 'EMSFelix', peso: 1 }], inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, seed: 1, ...extra })
const ficha = { v: 1, raca: 'elfo', classe: 'mago', antecedente: 'sabio', idade: 'adulto', destro: true, atributos: { for: 10, des: 10, con: 10, int: 17, sab: 10, car: 10 }, alinhamento: 'LB', idiomas: ['comum', 'elfico'], ferramentas: { caligrafo: false, falsificacao: false } }

// Semeia o localStorage uma vez por teste; recarregar a página não apaga o que o teste gravou.
async function abrir(page, hash, semente = null) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('semear')) {
      localStorage.clear();
      localStorage.setItem('semear', '1');
      if (s) localStorage.setItem('writer.personagens', JSON.stringify(s));
    }
  }, semente)
  await page.goto('index.html' + hash)
}

test('criar Mago Elfo Sábio do início ao fim', async ({ page }) => {
  await abrir(page, '#ficha')
  const v = page.locator('#vista-ficha')
  await expect(v).toBeVisible()

  // Passo 1: quem é
  await v.getByLabel('Nome', { exact: true }).fill('Elaria')
  await v.getByLabel('Raça').selectOption({ label: 'Elfo' })
  await v.getByRole('button', { name: 'Próximo' }).click()

  // Passo 2: classe e antecedente
  await v.getByLabel('Classe').selectOption({ label: 'Mago' })
  await v.getByLabel('Antecedente').selectOption({ label: 'Sábio' })
  await v.getByRole('button', { name: 'Próximo' }).click()

  // Passo 3: atributos
  await v.getByLabel('INT', { exact: true }).fill('17')
  await v.getByLabel('INT', { exact: true }).press('Tab')
  await v.getByRole('button', { name: 'Próximo' }).click()

  // Passo 4: alinhamento
  await v.getByRole('button', { name: 'Leal e Bom', exact: true }).click()
  await expect(v.getByRole('button', { name: 'Leal e Bom', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await v.getByRole('button', { name: 'Próximo' }).click()

  // Passo 5: idiomas; Élfico vem da raça e não pode ser desmarcado
  const elfico = v.getByRole('checkbox', { name: 'Élfico', exact: true })
  await expect(elfico).toBeChecked()
  await expect(elfico).toBeDisabled()
  await v.getByRole('button', { name: 'Próximo' }).click()

  // Passo 6: letra; três propostas, escolhe a 2ª (Mistura)
  const usar = v.locator('details.ficha-passo[open]').getByRole('button', { name: 'Usar', exact: true })
  await expect(usar).toHaveCount(3)
  await usar.nth(1).click()
  await v.getByRole('button', { name: 'Próximo' }).click()

  // Passo 7: perfis de escrita, com os nomes sugeridos
  await expect.poll(() => v.getByLabel('Nome do perfil').evaluateAll((es) => es.map((e) => e.value)))
    .toEqual(expect.arrayContaining(['Grimório', 'Escrita Élfica']))
  await v.getByRole('button', { name: 'Próximo' }).click()

  // Passo 8: resumo e salvar
  await v.getByRole('button', { name: 'Salvar personagem' }).click()
  await expect(page).toHaveURL(/#personagens$/)

  const estado = await page.evaluate(() => ({
    personagens: JSON.parse(localStorage.getItem('writer.personagens')),
    rascunho: JSON.parse(localStorage.getItem('writer.ficha.rascunho')),
  }))
  const p = estado.personagens.Elaria
  expect(p).toBeDefined()
  expect(p.ficha.classe).toBe('mago')
  expect(p.ficha.raca).toBe('elfo')
  expect(Object.keys(p.variacoes)).toEqual(expect.arrayContaining(['Grimório', 'Escrita Élfica']))
  expect(p.mao.base).toHaveLength(2)
  expect(estado.rascunho).toBeNull()
})

test('reabrir ficha volta ao wizard com os dados', async ({ page }) => {
  const salvo = { Elaria: { nome: 'Elaria', mao: mao(), variacoes: { normal: {} }, ficha } }
  await abrir(page, '#personagens', salvo)
  await page.getByRole('button', { name: 'Reabrir ficha Elaria' }).click()

  const v = page.locator('#vista-ficha')
  await expect(v).toBeVisible()
  await expect(page).toHaveURL(/#ficha$/)
  await expect(v.locator('details.ficha-passo').nth(0).locator('summary')).toContainText('Elaria')
  await expect(v.locator('details.ficha-passo').nth(1).locator('summary')).toContainText('Mago, Sábio')

  // Vai direto ao passo 8 pelo resumo e salva: deve editar, não duplicar
  await v.locator('details.ficha-passo').nth(7).locator('summary').click()
  await v.getByRole('button', { name: 'Salvar personagem' }).click()
  await expect(page).toHaveURL(/#personagens$/)
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('writer.personagens'))))).toEqual(['Elaria'])
})
