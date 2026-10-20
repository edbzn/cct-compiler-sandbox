Angular 22.2.0 Cypress Component Testing (Cypress 15.17.0) run under eight compiler setups, all with the same
specs and components. Every run is cold: compiler and dev-server caches are deleted first. Runs are strictly sequential.

| setup | dev server | Angular compilation |
|---|---|---|
| `regular` | Cypress `framework: 'angular', bundler: 'webpack'`: angular.json + `@angular-devkit/build-angular` webpack config, with Cypress's default `justInTimeCompile` | JIT (Cypress forces `aot: false`), `@ngtools/webpack` + Babel |
| `analog` | Cypress `framework: 'angular', bundler: 'vite'` + `viteConfig` | `@analogjs/vite-plugin-angular` `{ jit: true }` (a production monorepo's setting) |
| `analog-aot` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false }` |
| `analog-fast` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false, fastCompile: true }`: Analog's single-pass compiler. It compiles each file on request with Angular's compiler, without a TypeScript program or template type-checking |
| `angular-build` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false, experimental: { useAngularCompilationAPI: true } }`: compiles through `@angular/build`'s `createAngularCompilation`, the AOT pipeline of the Angular CLI's esbuild builder |
| `angular-build-jit` | same Vite config | same, `{ jit: true }` (TestBed override parity) |
| `oxc` | same Vite config | `@oxc-angular/vite` (AOT, emits class metadata) |
| `swc` | same Vite config | `unplugin-swc` + `@jscutlery/swc-angular` preset in place of an Angular plugin: SWC strips types and decorators, templates compile at runtime (JIT) |

`regular` needs two workarounds before it runs on Angular 22 (see "Setup-specific workarounds"). Without them it cannot run any spec.

All setups were benchmarked in one session, one Cypress process at a time.
