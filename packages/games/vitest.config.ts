import { defineConfig } from 'vitest/config';

// Los bots expertos simulan partidas de 60-160 s: en un equipo lento (CI) necesitan más de los 5 s por defecto.
export default defineConfig({ test: { testTimeout: 120000 } });
