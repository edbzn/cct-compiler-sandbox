## Why there is no "Cypress + esbuild" setup

The Angular CLI builds applications with esbuild (`@angular/build:application`) by default, but Cypress has no
esbuild or `@angular/build` option for Angular component testing. `framework: 'angular'` only exists with
`bundler: 'webpack'`, and its handler loads `@angular-devkit/build-angular`'s webpack internals
(`webpack-browser-config`, `getCommonConfig`, `getStylesConfig`). The request for an esbuild-based Angular dev server
is still open: [cypress-io/cypress#30903](https://github.com/cypress-io/cypress/issues/30903).

The closest available equivalent is Angular's own compilation pipeline from `@angular/build`
(`createAngularCompilation`, used by the CLI's esbuild application builder) run inside Cypress's Vite dev server.
`@analogjs/vite-plugin-angular` exposes it as `experimental.useAngularCompilationAPI`:

- `angular-build` (`jit: false`) mirrors the CLI esbuild builder's AOT compilation.
- `angular-build-jit` (`jit: true`) uses the same API in JIT mode, so `TestBed.overrideComponent` works.

Bundling is still Vite's (esbuild pre-bundling for npm dependencies, on-demand transforms for sources), not the CLI's
esbuild application bundle. These setups measure Angular's compiler pipeline, not the CLI's bundler.
