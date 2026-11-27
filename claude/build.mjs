import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { copyFile } from 'node:fs/promises';

const dependencyRoot = process.env.VIDEO_TUTORIAL_BUILD_DEPS;
const load = dependencyRoot ? createRequire(resolve(dependencyRoot, 'package.json')) : createRequire(import.meta.url);
const { build } = load('esbuild');
await build({
  entryPoints: ['src/server.mjs'],
  outfile: 'dist/server.cjs',
  bundle: true,
  target: 'node22',
  platform: 'node',
  format: 'cjs',
  minify: true,
  nodePaths: dependencyRoot ? [resolve(dependencyRoot, 'node_modules')] : [],
  legalComments: 'linked'
});
await copyFile('src/annotate.ps1', 'dist/annotate.ps1');
