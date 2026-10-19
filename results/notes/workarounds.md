## Setup-specific workarounds

### regular (webpack): two blockers on Angular 22, both fixed in this sandbox

1. **webpack-dev-server 6.** `@angular-devkit/build-angular@22.2.0` depends on `webpack-dev-server@6.0.0`.
   Cypress resolves webpack-dev-server from build-angular's directory and accepts only major 5, so the config
   process crashes before any spec runs (`results/regular-wds6-error.log`):
   ```
   Your configFile threw an error from: cypress.config.js
   Error: Unexpected major version of webpack-dev-server. Cypress webpack-dev-server works with webpack-dev-server versions 5 - saw 6.0.0
   ```
   Cypress 16.1.1 (also in the local cache) has the same `[5]` check. **Fix:** a pnpm override
   `'@angular-devkit/build-angular>webpack-dev-server': 5.2.7` in `pnpm-workspace.yaml`.
2. **Babel 8 under Cypress's tsx loader.** Cypress starts the config process with
   `NODE_OPTIONS=--import …/tsx/dist/loader.mjs` and loads build-angular's webpack config through tsx. build-angular 22
   requires the ESM-only Babel 8 packages, and tsx's CJS hook transpiles them with esbuild, which turns `import.meta`
   into `const import_meta={}`. Babel then calls `createRequire(undefined)`, every module fails, and the run hangs
   with "webpack compiled with 14 errors" (`results/regular-unpatched-babel8-tsx-error.log`):
   ```
   Module build failed (from ./node_modules/.pnpm/@angular-devkit+build-angular@22.2.0_…/src/tools/babel/webpack-loader.js):
   TypeError [ERR_INVALID_ARG_VALUE]: [BABEL] …/@cypress/webpack-dev-server/dist/browser.js: The argument 'filename' must be a file URL object, file URL string, or absolute path string. Received undefined (While processing: "base$0")
       at createRequire (node:internal/modules/cjs/loader:2084:11)
       at …/@babel/helper-define-polyfill-provider/lib/index.node.js:730:19
   ```
   **Fix:** `cypress/tsx-import-meta-shim.ts` wraps `Module.prototype._compile` in the config process. For
   `node_modules` files it rewrites tsx's empty `import_meta` object into one with a real `url`. The shim is only
   installed for `CCT_SETUP=regular` (`NO_IMPORT_META_SHIM=1` turns it off to reproduce the failure).
   This error only shows on a cold `.angular/cache`. A warm webpack cache skips Babel, so a project that cached a
   compile before upgrading can look healthy.
3. `@angular-devkit/core` must be a direct dependency, because pnpm does not hoist it and Cypress resolves it from the
   project root.

With these in place `regular` uses Cypress's built-in Angular handler unchanged: angular.json `build` options merged
with the `development` configuration, and JIT. Cypress hardcodes `aot: false`.

### analog / analog-aot / oxc (Vite)

- Same Vite config for all three. Only the Angular plugin differs. It uses a production monorepo's `optimizeDeps`
  (`noDiscovery` plus the Angular include list), `resolve.mainFields: ['module']` and `resolve.dedupe`.
  Three entries were added to the include list: `@angular/platform-browser/testing` (`@cypress/angular` 5 imports it,
  not `platform-browser-dynamic/testing`), and `@angular/cdk/dialog` (used by the dialog spec).
  The `tty` shim that monorepo needs for CDK was not needed here.
- `vite-tsconfig-paths` gets the root `tsconfig.json`, not `cypress/tsconfig.json`. The plugin applies a
  tsconfig's `paths` only to importers under that tsconfig's directory, so `cypress/tsconfig.json` never matched
  `src/**` (the `@scale/*` alias failed to resolve).
- `@oxc-angular/vite` 0.0.41 declares `vite >=8` as a peer. It works on Vite 7.3.6 (pnpm prints a peer warning).
  Its linker registers a Rolldown `optimizeDeps` plugin, which Vite 7's esbuild optimizer ignores. Pre-bundled
  partial-compiled packages (CDK) therefore get JIT-linked at runtime through `@angular/compiler`, while
  non-pre-bundled `node_modules` packages (the sandbox's `sandbox-ui-lib`) go through its transform-time linker.
- `analog-aot` (`jit: false`) fails `TestBed.overrideComponent` (2 tests in `greeting.cy.ts`). AOT strips the
  decorator TestBed needs to recompile the component. This is why a production monorepo using Analog sets `jit: true`. Its timings are
  still listed for reference.

### Spec-level notes (all setups)

- Router spec: TestBed never bootstraps an app, so the spec calls `router.navigateByUrl('/')` after mount and uses
  `withHashLocation()` so navigation does not change the spec iframe's path.
- Card spec: the `ng-content` fallback text is compared after trimming. Whitespace around projected fallback content is
  not something this comparison should depend on.
