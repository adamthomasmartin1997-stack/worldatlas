import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_HASH_ROUTER=1 builds a self-contained copy (relative paths, hash URLs) for static hosts like the Claude artifact viewer.
export default defineConfig({ plugins: [react()], base: process.env.VITE_HASH_ROUTER ? './' : '/' });
