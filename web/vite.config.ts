/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // No GitHub Pages o site fica em /nome-do-repositorio/ (definido por VITE_BASE no build).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    // Aceita acessos pela rede local (ex.: o app mobile abre a página de compra no celular).
    host: true,
    // Em desenvolvimento, /api é encaminhado para a API Fastify.
    proxy: { '/api': 'http://localhost:3333' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
