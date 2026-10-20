# CCT compiler sandbox

Standalone Angular 22 workspace that runs the same Cypress Component Testing (CCT) specs under several compiler
setups and benchmarks them. Results: [`results/RESULTS.md`](results/RESULTS.md).

| `CCT_SETUP` | dev server | Angular compilation |
|---|---|---|
| `regular` | Cypress `framework: 'angular', bundler: 'webpack'` (angular.json + `@angular-devkit/build-angular`) | JIT, `@ngtools/webpack` |
| `analog` (default) | Cypress `framework: 'angular', bundler: 'vite'` + `viteConfig` | `@analogjs/vite-plugin-angular` `{ jit: true }` |
| `analog-aot` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false }` |
| `analog-fast` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false, fastCompile: true }`: Analog's single-pass compiler, one file at a time, no TypeScript program |
| `angular-build` | same Vite config | Analog with `experimental.useAngularCompilationAPI` + `{ jit: false }`: `@angular/build`'s `createAngularCompilation` (the CLI esbuild builder's AOT pipeline) |
| `angular-build-jit` | same Vite config | same, `{ jit: true }` |
| `oxc` | same Vite config | `@oxc-angular/vite` (AOT with class metadata) |
| `swc` | same Vite config | `unplugin-swc` + `@jscutlery/swc-angular` preset, runtime JIT (support file `cypress/support/component-swc.ts` adds `reflect-metadata`) |

Cypress has no esbuild / `@angular/build` dev server for Angular component testing
([cypress-io/cypress#30903](https://github.com/cypress-io/cypress/issues/30903)). The `angular-build*` setups are the
closest stand-in: Angular's esbuild-builder compilation pipeline running inside Cypress's Vite dev server.

All of them live in one [`cypress.config.ts`](cypress.config.ts), selected by the `CCT_SETUP` environment variable.

## Setup

```sh
pnpm install                     # Cypress binary 15.17.0 must be in ~/.cache/Cypress (or let pnpm download it)
node scripts/generate-scale.mjs  # writes the scale fixture (300 components) to src/scale/{generated,specs}
```

`packages/ui-lib/dist` (committed) is a partial-compiled Angular library consumed as the `sandbox-ui-lib` npm
dependency. Rebuild it with `node scripts/build-ui-lib.mjs` followed by `pnpm install`.

## Run one setup

```sh
CCT_SETUP=regular    pnpm exec cypress run --component
CCT_SETUP=analog     pnpm exec cypress run --component
CCT_SETUP=analog-aot pnpm exec cypress run --component
CCT_SETUP=analog-fast pnpm exec cypress run --component
CCT_SETUP=oxc        pnpm exec cypress run --component
CCT_SETUP=angular-build     pnpm exec cypress run --component
CCT_SETUP=angular-build-jit pnpm exec cypress run --component
CCT_SETUP=swc               pnpm exec cypress run --component

# a subset
CCT_SETUP=oxc pnpm exec cypress run --component --spec 'src/known-gaps/*.cy.ts'
```

Set `TMPDIR=$PWD/.tmp` to keep Cypress's temporary files out of `/tmp`. The bench script does this.
Delete `.angular/`, `.cypress-vite/`, `node_modules/.cache/` and `.swc/` to get a cold compile.

## Benchmark

```sh
node scripts/bench.mjs --runs 3 --passes all,scale,gaps --scale-n 300
node scripts/bench.mjs --runs 3 --passes scale --scale-n 1000 --label n1000
node scripts/report.mjs          # results/runs.jsonl -> results/summary.json + results/RESULTS.md
```

The bench runs one Cypress process at a time and clears every compiler cache before each run. While a run is going
it samples the RSS and PSS of the whole process tree once a second. See the methodology section of `RESULTS.md`.

## Layout

- `src/app/*`: hand-written components and specs. They cover signals with `input()`/`output()`/`model()`,
  `@if/@for/@switch/@defer`, `templateUrl` + SCSS `styleUrl`, `ViewEncapsulation`, DI + `HttpClient` with
  `cy.intercept`, reactive forms, CDK dialog + connected overlay, pipes, content projection, host
  bindings/listeners, router, a linked npm library, and `TestBed.overrideProvider`. Every setup passes all of them.
- `src/known-gaps/*`: what some setups can't do, kept out of the timing comparison:
  `TestBed.overrideComponent` (fails under plain AOT, and loses inputs under `fastCompile`: analogjs/analog#2666)
  and the two open `@oxc-angular/vite` 0.0.41 bugs (upstream issues #585 and #586).
- `scripts/generate-scale.mjs`: the compile-heavy fixture generator. Its output is gitignored.
- `cypress/tsx-import-meta-shim.ts`: workaround needed for the `regular` setup on Angular 22 (see `RESULTS.md`).
- `pnpm-workspace.yaml`: the `webpack-dev-server` 5 override, also needed for `regular`.
