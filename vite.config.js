import { defineConfig } from 'vite'
import { cpSync, existsSync } from 'node:fs'

// fontes/ (e dados/, só local) são lidos por fetch em tempo de execução: copia para dist/.
const copiarEstaticos = {
  name: 'copiar-estaticos',
  closeBundle() {
    for (const d of ['fontes', 'dados']) if (existsSync(d)) cpSync(d, `dist/${d}`, { recursive: true })
  },
}

export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { index: 'index.html', grimorio: 'grimorio.html' } } },
  plugins: [copiarEstaticos],
})
