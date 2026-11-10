import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

// GitHub Pages ではリポジトリ名がサブパスになるため、既定は相対パス './'。
// 絶対パスが必要な場合は VITE_BASE=/リポジトリ名/ で上書きできる。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: env.VITE_BASE || './',
    plugins: [react(), cesium()],
    build: {
      chunkSizeWarningLimit: 6000,
    },
  };
});
