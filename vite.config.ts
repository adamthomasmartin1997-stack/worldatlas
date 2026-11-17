import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const artifact = Boolean(process.env.VITE_HASH_ROUTER);

// VITE_HASH_ROUTER=1 builds a self-contained copy (relative paths, hash URLs) for static hosts like the Claude artifact viewer.
// That host holds only ~500 files, so deep-dive pages are grouped into one chunk per first letter of the country code there
// (the normal site keeps one small chunk per page).
export default defineConfig({
  plugins: [react()],
  base: artifact ? './' : '/',
  build: artifact ? {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const m = id.match(/content\/deep\/(\w+)\/\w+\.json/);
          return m ? `deep-${m[1][0]}` : undefined; // e.g. deep-f holds FRA, FIN, FJI…
        },
      },
    },
  } : {},
});
