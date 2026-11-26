import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function prepareStaticHosting(): Plugin {
  return {
    name: 'prepare-static-hosting',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const swPath = path.join(distDir, 'sw.js');
      const assetsDir = path.join(distDir, 'assets');
      const indexPath = path.join(distDir, 'index.html');
      const notFoundPath = path.join(distDir, '404.html');

      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
      }

      if (!fs.existsSync(swPath) || !fs.existsSync(assetsDir)) return;

      const assetFiles = fs
        .readdirSync(assetsDir)
        .map((file) => `./assets/${file}`);
      const swContent = fs.readFileSync(swPath, 'utf8');
      const updated = swContent
        .replace('__BUILD_HASH__', String(Date.now()))
        .replace("['__PRECACHE_MANIFEST__']", JSON.stringify(assetFiles));
      fs.writeFileSync(swPath, updated, 'utf8');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), prepareStaticHosting()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
