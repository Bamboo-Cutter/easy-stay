import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      // 🔥 所有 /hotel 开头的请求转发到后端
      // '/hotel': {
      //   target: 'http://localhost:3000',  // 你的后端地址
      //   changeOrigin: true,
      // },
      // 或者统一代理所有 /api 前缀
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // 去掉 /api
      }
    }
  }
})
