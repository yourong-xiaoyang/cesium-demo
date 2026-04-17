import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'
import path from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { fileURLToPath } from 'url'

// 自定义插件，将 public 目录内容复制到构建输出的 public 目录，并清理根目录的重复文件
function copyPublicToOutput() {
  return {
    name: 'copy-public-to-output',
    closeBundle() {
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      const publicDir = path.resolve(__dirname, 'public')
      const outputDir = path.resolve(__dirname, 'dist/public')
      
      if (existsSync(publicDir)) {
        // 创建输出目录
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true })
        }
        
        // 复制文件
        const files = readdirSync(publicDir)
        files.forEach(file => {
          const srcPath = path.join(publicDir, file)
          const destPath = path.join(outputDir, file)
          copyFileSync(srcPath, destPath)
          
          // 清理根目录的重复文件
          const rootFile = path.join(__dirname, 'dist', file)
          if (existsSync(rootFile)) {
            unlinkSync(rootFile)
          }
        })
      }
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), cesium(), copyPublicToOutput()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    open: true,
    hmr: true
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'js/[name].[hash].js',
        entryFileNames: 'js/[name].[hash].js'
      }
    }
  }
})
