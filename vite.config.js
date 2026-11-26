import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Raíz fija con barras normales y letra de disco en mayúscula: en Windows, si la ruta
// llega distinta, Vite puede empaquetar dos copias del mismo módulo y romper el contexto de React.
const root = fileURLToPath(new URL('.', import.meta.url))
  .split('\\').join('/')
  .replace(/^([a-z]):/, (m, d) => d.toUpperCase() + ':')
  .replace(/\/$/, '');

export default defineConfig({ root, plugins: [react()], base: './' });
