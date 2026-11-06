import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' + HashRouter means the build works at any GitHub Pages path
// (https://<user>.github.io/<repo>/) without knowing the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
})
