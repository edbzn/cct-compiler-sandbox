Angular 22.2.0 Cypress Component Testing (Cypress 15.17.0) run under four compiler setups, all with the same
specs and components. Every run is cold: compiler and dev-server caches are deleted first. Runs are strictly sequential.

| setup | dev server | Angular compilation |
|---|---|---|
| `regular` | Cypress `framework: 'angular', bundler: 'webpack'`: angular.json + `@angular-devkit/build-angular` webpack config, with Cypress's default `justInTimeCompile` | JIT (Cypress forces `aot: false`), `@ngtools/webpack` + Babel |
| `analog` | Cypress `framework: 'angular', bundler: 'vite'` + `viteConfig` | `@analogjs/vite-plugin-angular` `{ jit: true }` (a production monorepo's setting) |
| `analog-aot` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false }` |
| `oxc` | same Vite config | `@oxc-angular/vite` (AOT, emits class metadata) |

`regular` needs two workarounds before it runs on Angular 22 (see "Setup-specific workarounds"). Without them it cannot run any spec.
