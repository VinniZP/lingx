import { defineConfig } from 'tsup';

export default defineConfig([
  // Client bundle (with "use client" directive)
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['react', 'react-dom', 'next'],
    treeshake: true,
    splitting: false,
    minify: false,
    sourcemap: true,
  },
  // Server bundle (no "use client" directive)
  {
    entry: {
      'server/index': 'src/server/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: false, // Don't clean since client bundle already cleaned
    external: ['react', 'react-dom', 'next'],
    treeshake: true,
    splitting: false,
    minify: false,
    sourcemap: true,
  },
]);
