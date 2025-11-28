import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'calculations/index': 'src/calculations/index.ts',
    'data/index': 'src/data/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
