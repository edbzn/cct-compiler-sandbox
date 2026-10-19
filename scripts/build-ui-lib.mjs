// Builds packages/ui-lib with ngc in partial compilation mode, i.e. the same ɵɵngDeclare* output
// ng-packagr ships to npm. The result is consumed as a normal node_modules dependency
// (`file:` dependency, copied into node_modules/.pnpm), so every Vite setup links it at runtime/transform time.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'packages/ui-lib');
rmSync(join(lib, 'dist'), { recursive: true, force: true });
execFileSync(join(root, 'node_modules/.bin/ngc'), ['-p', join(lib, 'tsconfig.lib.json')], { stdio: 'inherit' });
writeFileSync(
  join(lib, 'dist/package.json'),
  JSON.stringify(
    {
      name: 'sandbox-ui-lib',
      version: '1.0.0',
      type: 'module',
      module: './index.js',
      typings: './index.d.ts',
      exports: { '.': { types: './index.d.ts', default: './index.js' } },
      sideEffects: false,
      peerDependencies: { '@angular/core': '>=22.0.0', '@angular/platform-browser': '>=22.0.0' },
    },
    null,
    2,
  ) + '\n',
);
console.log('built packages/ui-lib/dist');
