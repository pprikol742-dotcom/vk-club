import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base: '/vk-club/' — под GitHub Pages (username.github.io/vk-club/).
// Если назовёшь репозиторий иначе — поменяй здесь на /имя-репозитория/.
export default defineConfig({
  plugins: [react()],
  base: '/vk-club/',
})
