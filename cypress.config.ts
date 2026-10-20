import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'cypress';
import { installTsxImportMetaShim } from './cypress/tsx-import-meta-shim';

/**
 * One config, three compiler setups selected with CCT_SETUP:
 *   regular    framework angular + bundler webpack: Cypress's built-in Angular CLI handler (angular.json +
 *              @angular-devkit/build-angular, JIT). Needs two workarounds on Angular 22, see README:
 *              the webpack-dev-server 5 override (pnpm-workspace.yaml) and installTsxImportMetaShim().
 *   analog     framework angular + bundler vite + @analogjs/vite-plugin-angular { jit: true }
 *   analog-aot same as analog with { jit: false }
 *   analog-fast same as analog-aot with { fastCompile: true }: Analog's single-pass compiler, one file at a time,
 *              no TypeScript program and no template type-checking
 *   angular-build      same Vite config + Analog with experimental.useAngularCompilationAPI, { jit: false }:
 *                      compiles through @angular/build's createAngularCompilation (the CLI esbuild builder's AOT
 *                      pipeline). Stand-in for "Cypress + esbuild", which Cypress does not offer for Angular
 *                      (cypress-io/cypress#30903).
 *   angular-build-jit  same with { jit: true } (TestBed override parity)
 *   swc        same Vite config, but the Angular plugin is replaced with unplugin-swc +
 *              @jscutlery/swc-angular's preset: SWC strips types/decorators to legacy decorator calls and
 *              rewrites templateUrl/styleUrl into ?raw/?inline imports; templates compile at runtime (JIT)
 *              through the support file's @angular/compiler. Uses cypress/support/component-swc.ts
 *              (adds reflect-metadata).
 *   oxc        framework angular + bundler vite + @oxc-angular/vite (AOT, emits class metadata)
 * BENCH_EVENTS (optional) is a JSONL file the bench script reads for spec/dev-server timings.
 */
type Setup = 'regular' | 'analog' | 'analog-aot' | 'analog-fast' | 'angular-build' | 'angular-build-jit' | 'oxc' | 'swc';
const SETUPS: readonly Setup[] = ['regular', 'analog', 'analog-aot', 'analog-fast', 'angular-build', 'angular-build-jit', 'oxc', 'swc'];
const setup = (process.env.CCT_SETUP ?? 'analog') as Setup;
if (!SETUPS.includes(setup)) {
  throw new Error(`CCT_SETUP must be one of ${SETUPS.join(', ')} (got "${setup}")`);
}

const projectRoot = __dirname;
const specPattern = 'src/**/*.cy.ts';
const supportFile = setup === 'swc' ? 'cypress/support/component-swc.ts' : 'cypress/support/component.ts';
const tsconfig = path.join(projectRoot, 'cypress/tsconfig.json');
const eventsFile = process.env.BENCH_EVENTS;
const record = (event: string, data: Record<string, unknown> = {}): void => {
  if (eventsFile) {
    fs.appendFileSync(eventsFile, JSON.stringify({ event, t: Date.now(), ...data }) + '\n');
  }
};
record('config:loaded', { setup });
if (setup === 'regular' && process.env.NO_IMPORT_META_SHIM !== '1') {
  installTsxImportMetaShim();
}

// Shared by every Vite setup (analog*, angular-build*, oxc): only the Angular plugin differs.
const createViteConfig = async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const angularPlugins = await getAngularVitePlugins();
  return {
    cacheDir: path.join(projectRoot, '.cypress-vite', setup),
    logLevel: 'warn' as const,
    resolve: {
      mainFields: ['module'],
      dedupe: ['@angular/core', '@angular/common', '@angular/forms', '@angular/router', '@angular/platform-browser'],
    },
    optimizeDeps: {
      noDiscovery: true,
      include: [
        'tslib',
        '@angular/core',
        '@angular/core/rxjs-interop',
        '@angular/common',
        '@angular/common/http',
        '@angular/platform-browser',
        '@angular/platform-browser/animations',
        '@angular/forms',
        '@angular/router',
        '@angular/compiler',
        '@angular/core/primitives/signals',
        '@angular/core/testing',
        '@angular/platform-browser-dynamic/testing',
        // Added for this sandbox: @cypress/angular 5 imports platform-browser/testing,
        // and the dialog spec uses cdk/dialog.
        '@angular/platform-browser/testing',
        '@angular/cdk/overlay',
        '@angular/cdk/portal',
        '@angular/cdk/a11y',
        '@angular/cdk/dialog',
        'rxjs',
        'rxjs/operators',
        // swc only: its support file imports reflect-metadata (CJS/UMD, so it must be pre-bundled).
        ...(setup === 'swc' ? ['reflect-metadata'] : []),
      ],
    },
    plugins: [tsconfigPaths({ root: projectRoot, projects: [path.join(projectRoot, 'tsconfig.json')] }), ...angularPlugins, benchVitePlugin()],
  };
};

const getAngularVitePlugins = async () => {
  if (setup === 'swc') {
    const { default: swc } = await import('unplugin-swc');
    const { swcAngularUnpluginOptions } = await import('@jscutlery/swc-angular');
    return [swc.vite(swcAngularUnpluginOptions())];
  }
  if (setup === 'oxc') {
    const { angular } = await import('@oxc-angular/vite');
    const [major, minor, patch] = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'node_modules/@angular/core/package.json'), 'utf-8'),
    )
      .version.split('.')
      .map((part: string) => parseInt(part, 10));
    return angular({
      tsconfig,
      workspaceRoot: projectRoot,
      angularVersion: { major, minor, patch },
      liveReload: false,
      sourceMap: true,
    });
  }
  const { default: angular } = await import('@analogjs/vite-plugin-angular');
  if (setup === 'angular-build' || setup === 'angular-build-jit') {
    return angular({ jit: setup === 'angular-build-jit', tsconfig, experimental: { useAngularCompilationAPI: true } });
  }
  if (setup === 'analog-fast') {
    return angular({ jit: false, tsconfig, fastCompile: true });
  }
  return angular({ jit: setup === 'analog', tsconfig });
};

// Timestamps for the bench: dev-server creation/listen, plus the first and last module transform.
const benchVitePlugin = () => {
  let transforms = 0;
  let firstTransform = 0;
  return {
    name: 'bench-timings',
    configureServer(server: { httpServer: { once(e: string, cb: () => void): void } | null }) {
      record('vite:configureServer');
      server.httpServer?.once('listening', () => record('vite:listening'));
    },
    transform() {
      transforms++;
      if (!firstTransform) {
        firstTransform = Date.now();
        record('vite:firstTransform');
      }
      return null;
    },
    buildEnd() {
      record('vite:buildEnd', { transforms });
    },
  };
};

// Webpack counterpart: records every compilation (Cypress justInTimeCompile recompiles per spec).
class BenchWebpackPlugin {
  apply(compiler: { hooks: { done: { tap(name: string, cb: (stats: { startTime?: number; endTime?: number; hasErrors(): boolean; compilation: { modules: { size: number } } }) => void): void } } }) {
    compiler.hooks.done.tap('bench-timings', (stats) => {
      record('webpack:done', {
        startTime: stats.startTime,
        endTime: stats.endTime,
        errors: stats.hasErrors(),
        modules: stats.compilation.modules.size,
      });
    });
  }
}

export default defineConfig({
  allowCypressEnv: false,
  video: false,
  screenshotOnRunFailure: false,
  defaultCommandTimeout: 10000,
  component: {
    specPattern,
    supportFile,
    indexHtmlFile: 'cypress/support/component-index.html',
    devServer:
      setup === 'regular'
        ? { framework: 'angular', bundler: 'webpack', webpackConfig: { plugins: [new BenchWebpackPlugin()] } }
        : { framework: 'angular', bundler: 'vite', viteConfig: createViteConfig },
    setupNodeEvents(on) {
      on('before:run', () => record('before:run'));
      on('task', {
        'bench:mark': ({ event, ...data }: { event: string } & Record<string, unknown>) => {
          record(event, data);
          return null;
        },
      });
      on('before:spec', (spec) => record('before:spec', { spec: spec.relative }));
      on('after:spec', (spec, results) =>
        record('after:spec', {
          spec: spec.relative,
          stats: results?.stats,
          tests: results?.tests?.map((t) => ({ title: t.title.join(' > '), state: t.state, duration: t.duration, error: t.displayError?.split('\n')[0] })),
        }),
      );
      on('after:run', (results) => {
        if ('totalTests' in results) {
          record('after:run', {
            totalTests: results.totalTests,
            totalPassed: results.totalPassed,
            totalFailed: results.totalFailed,
            totalPending: results.totalPending,
            totalSkipped: results.totalSkipped,
            totalDuration: results.totalDuration,
          });
        }
      });
    },
  },
});
