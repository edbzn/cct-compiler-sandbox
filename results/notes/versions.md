## Versions (exact, from node_modules)

| package | version | note |
|---|---|---|
| @angular/{core,common,compiler,compiler-cli,platform-browser,platform-browser-dynamic,forms,router,animations,cdk} | 22.2.0 | |
| @angular-devkit/build-angular, @angular-devkit/core, @angular/cli | 22.2.0 | build-angular pulls in @angular/build 22.2.0 and @ngtools/webpack 22.2.0 |
| webpack (via build-angular) | 5.111.0 | |
| webpack-dev-server (via build-angular) | **5.2.7** | build-angular wants 6.0.0. Overridden for Cypress (see workarounds) |
| @babel/core (via build-angular) | 8.0.5 | |
| zone.js | 0.16.3 | |
| typescript | 6.0.3 | |
| cypress | 15.17.0 | Electron 37.6.0, config process on host Node 24.18.1 |
| @cypress/angular | 5.0.0 | |
| vite | 7.3.6 | esbuild 0.28.2, rollup 4.64.10 |
| @analogjs/vite-plugin-angular | 2.8.0 | |
| @oxc-angular/vite | 0.0.41 | native binding @oxc-angular/binding-linux-x64-gnu 0.0.41 |
| @angular/build | 22.2.0 | direct devDependency for the `angular-build*` setups (same copy build-angular uses) |
| @jscutlery/swc-angular / @jscutlery/swc-angular-plugin | 0.22.0 / 0.22.0 | `swc` setup (latest 0.22.x) |
| @swc/core | 1.15.8 | the preset's peer is `~1.15.0` |
| unplugin-swc | 2.0.0 | |
| reflect-metadata | 0.2.2 | `swc` support file only |
| vite-tsconfig-paths | 4.3.2 | |
| sass | 1.97.3 | |
| rxjs / tslib | 7.8.1 / 2.6.2 | |
| pnpm / node | 12.5.1 / 24.18.1 | |

Packages added beyond the requested list: `@angular-devkit/core` (Cypress's webpack handler resolves it
from the project root) and `sandbox-ui-lib` (local `file:` package: a partial-compiled library built with
`ngc` `compilationMode: partial`, the same `ɵɵngDeclare*` output ng-packagr publishes).
