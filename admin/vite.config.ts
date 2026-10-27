// Build for the separate admin website (deployed on Cloudflare Pages).
// Run from the repo root: npm run build:admin  ->  admin/dist
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

const adminDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(adminDir, '..');

// Google AI Studio can overwrite the root firebase-applet-config.json with its own preview
// project. The admin site must always talk to the live task-molly project, so it uses the
// protected copy in .github/live-config/ (the same one the main site's deploy uses).
const liveFirebaseConfig = path.join(repoRoot, '.github/live-config/firebase-applet-config.json');
function useLiveFirebaseConfig(): Plugin {
  return {
    name: 'use-live-firebase-config',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.endsWith('firebase-applet-config.json')) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      return resolved && path.resolve(resolved.id) === path.join(repoRoot, 'firebase-applet-config.json')
        ? liveFirebaseConfig
        : null;
    },
  };
}

export default defineConfig({
  root: adminDir,
  envDir: repoRoot,
  plugins: [useLiveFirebaseConfig(), react(), tailwindcss()],
  resolve: {
    alias: { '@': repoRoot },
  },
  build: {
    outDir: path.join(adminDir, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 3001,
    fs: { allow: [repoRoot] },
  },
});
