// Build for the separate admin website: `npm run build:admin` -> admin-dist/
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');

export default defineConfig({
  root: here,
  envDir: repo,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Always use the live task-molly Firebase project. The root copy can be overwritten
      // by AI Studio pushes; .github/live-config/ holds the protected copy (see deploy.yml).
      {
        find: /^.*\/firebase-applet-config\.json$/,
        replacement: path.resolve(repo, '.github/live-config/firebase-applet-config.json'),
      },
      { find: '@', replacement: repo },
    ],
  },
  build: {
    outDir: path.resolve(repo, 'admin-dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
