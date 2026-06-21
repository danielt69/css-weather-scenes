import { defineConfig } from 'vite';

// GitHub *project* page → served from /css-weather-scenes/.
// Allow override for root-domain hosting via VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/css-weather-scenes/',
});
