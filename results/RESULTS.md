# CCT compiler comparison: results

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

## Pass/fail per setup

| setup | all (hand-written + scale-300) | scale-300 | scale-1000 | known-gaps |
|---|---|---|---|---|
| regular | 41/41 passed | 6/6 passed | 6/6 passed | 5/5 passed |
| analog | 41/41 passed | 6/6 passed | 6/6 passed | 5/5 passed |
| analog-aot | 41/41 passed | 6/6 passed | 6/6 passed | **3/5 passed, 2 failed** |
| analog-fast | 41/41 passed | 6/6 passed | 6/6 passed | **4/5 passed, 1 failed** |
| angular-build | 41/41 passed | 6/6 passed | 6/6 passed | **3/5 passed, 2 failed** |
| angular-build-jit | 41/41 passed | 6/6 passed | 6/6 passed | 5/5 passed |
| oxc | 41/41 passed | 6/6 passed | 6/6 passed | **2/5 passed, 3 failed** |
| swc | 41/41 passed | 6/6 passed | 6/6 passed | 5/5 passed |

Pending and skipped were 0 in every run. Failures (all runs, de-duplicated):

- `analog-aot` / gaps: src/known-gaps/override-component.cy.ts › known-gaps: TestBed.overrideComponent (plain AOT) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-20T08:09:39.243Z'
- `analog-aot` / gaps: src/known-gaps/override-component.cy.ts › known-gaps: TestBed.overrideComponent (plain AOT) > overrideComponent replaces the template — AssertionError: Timed out retrying after 10000ms: Expected to find element: `[data-cy=override]`, but never found it.
- `analog-fast` / gaps: src/known-gaps/override-component.cy.ts › known-gaps: TestBed.overrideComponent (plain AOT) > overrideComponent replaces the template — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'overridden template', but the text was 'overridden world'
- `angular-build` / gaps: src/known-gaps/override-component.cy.ts › known-gaps: TestBed.overrideComponent (plain AOT) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-20T08:10:26.336Z'
- `angular-build` / gaps: src/known-gaps/override-component.cy.ts › known-gaps: TestBed.overrideComponent (plain AOT) > overrideComponent replaces the template — AssertionError: Timed out retrying after 10000ms: Expected to find element: `[data-cy=override]`, but never found it.
- `oxc` / gaps: src/known-gaps/library-safe-url.cy.ts › known-gaps: OXC SafeUrl bound to a library img [src] (#586) > unwraps the SafeUrl and loads the image — AssertionError: Timed out retrying after 10000ms: expected '<img>' to have attribute 'src' with the value 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', but the value was 'SafeValue must use [property]=binding: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg== (see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss)'
- `oxc` / gaps: src/known-gaps/safe-navigation-event.cy.ts › known-gaps: OXC $safeNavigationMigration in event bindings (#585) > passes the @for item value to the handler — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text '2', but the text was 'null'
- `oxc` / gaps: src/known-gaps/safe-navigation-event.cy.ts › known-gaps: OXC $safeNavigationMigration in event bindings (#585) > passes the @if-as alias value to the handler — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text '7', but the text was 'null'

## Full suite (hand-written specs + scale fixture of 300 components)

Median (min–max) of 3 cold runs per setup. Times in seconds, memory in MB.

| setup | wall | vs regular | to first test | first-spec load | compile+load (all specs) | test bodies | webpack compile (sum) | peak RSS (tree) | peak PSS (tree) |
|---|---|---|---|---|---|---|---|---|---|
| regular | 34.1 (34.0–34.5) | 1.00× | 7.3 (7.3–7.5) | 3.7 (3.7–4.3) | 25.0 (24.6–25.6) | 5.55 (5.54–5.58) | 11.1 (11.0–11.3) | 4232 (4017–4233) | 3699 (3482–3700) |
| analog | 29.4 (29.3–29.7) | 0.86× | 5.8 (5.6–5.9) | 1.1 (1.1–1.1) | 19.2 (19.2–19.4) | 5.46 (5.45–5.47) | – | 2688 (2611–2691) | 2142 (2111–2144) |
| analog-aot | 29.6 (29.6–29.6) | 0.87× | 6.3 (6.3–6.3) | 1.1 (1.1–1.1) | 19.3 (19.3–19.3) | 4.71 (4.71–4.74) | – | 2611 (2609–2625) | 2179 (2167–2186) |
| analog-fast | 28.5 (28.4–28.7) | 0.83× | 5.2 (5.2–5.3) | 1.1 (1.1–1.1) | 19.2 (19.2–19.4) | 4.72 (4.70–4.74) | – | 2198 (2158–2224) | 1745 (1742–1753) |
| angular-build | 29.7 (29.6–29.7) | 0.87× | 6.5 (6.4–6.5) | 1.1 (1.0–1.1) | 19.2 (19.1–19.2) | 4.73 (4.69–4.73) | – | 2956 (2801–2996) | 2381 (2365–2492) |
| angular-build-jit | 29.5 (29.5–29.6) | 0.86× | 5.9 (5.8–5.9) | 1.1 (1.0–1.1) | 19.2 (19.2–19.3) | 5.48 (5.45–5.48) | – | 2761 (2731–2795) | 2291 (2282–2310) |
| oxc | 26.8 (26.7–26.9) | 0.78× | 3.4 (3.4–3.5) | 1.1 (1.1–1.1) | 19.4 (19.3–19.5) | 4.74 (4.71–4.79) | – | 2736 (2688–2767) | 2182 (2146–2213) |
| swc | 27.2 (27.2–27.3) | 0.80× | 3.4 (3.4–3.5) | 1.1 (1.1–1.1) | 19.5 (19.4–19.5) | 5.38 (5.37–5.40) | – | 2491 (2460–2537) | 2004 (1965–2023) |

## Scale fixture alone, 300 generated components (3 specs)

Median (min–max) of 3 cold runs per setup. Times in seconds, memory in MB.

| setup | wall | vs regular | to first test | first-spec load | compile+load (all specs) | test bodies | webpack compile (sum) | peak RSS (tree) | peak PSS (tree) |
|---|---|---|---|---|---|---|---|---|---|
| regular | 13.4 (13.3–13.5) | 1.00× | 8.0 (7.9–8.1) | 4.6 (4.5–5.0) | 8.7 (8.7–9.0) | 1.19 (1.17–1.20) | 8.0 (7.8–8.0) | 3502 (3283–3542) | 3006 (2866–3046) |
| analog | 9.9 (9.8–9.9) | 0.74× | 6.0 (6.0–6.0) | 1.6 (1.6–1.6) | 4.2 (4.2–4.2) | 1.18 (1.17–1.18) | – | 2540 (2504–2541) | 2116 (2077–2129) |
| analog-aot | 9.8 (9.8–9.8) | 0.73× | 6.2 (6.2–6.2) | 1.3 (1.2–1.3) | 3.9 (3.8–3.9) | 0.59 (0.59–0.59) | – | 2589 (2582–2591) | 2175 (2168–2180) |
| analog-fast | 8.9 (8.8–8.9) | 0.66× | 5.3 (5.2–5.3) | 1.2 (1.2–1.3) | 3.9 (3.8–3.9) | 0.60 (0.59–0.61) | – | 2116 (2114–2140) | 1709 (1695–1722) |
| angular-build | 10.2 (10.1–10.2) | 0.76× | 6.6 (6.5–6.6) | 1.3 (1.2–1.3) | 3.9 (3.9–3.9) | 0.59 (0.58–0.59) | – | 2781 (2756–2840) | 2358 (2329–2359) |
| angular-build-jit | 10.1 (10.0–10.1) | 0.75× | 6.2 (6.2–6.3) | 1.6 (1.6–1.6) | 4.2 (4.2–4.2) | 1.17 (1.16–1.18) | – | 2899 (2899–2931) | 2409 (2387–2449) |
| oxc | 7.1 (7.0–7.1) | 0.53× | 3.5 (3.4–3.5) | 1.3 (1.2–1.3) | 3.9 (3.8–3.9) | 0.60 (0.60–0.61) | – | 2623 (2479–2625) | 2112 (2071–2142) |
| swc | 7.8 (7.7–7.8) | 0.58× | 3.8 (3.8–3.9) | 1.6 (1.5–1.6) | 4.3 (4.2–4.3) | 1.16 (1.16–1.16) | – | 2371 (2335–2432) | 1894 (1884–1934) |

## Scale fixture alone, 1000 generated components (3 specs)

Median (min–max) of 3 cold runs per setup. Times in seconds, memory in MB.

| setup | wall | vs regular | to first test | first-spec load | compile+load (all specs) | test bodies | webpack compile (sum) | peak RSS (tree) | peak PSS (tree) |
|---|---|---|---|---|---|---|---|---|---|
| regular | 20.8 (20.8–21.0) | 1.00× | 10.6 (10.5–10.6) | 6.5 (6.5–6.7) | 14.2 (14.1–14.4) | 2.50 (2.48–2.51) | 13.7 (13.6–13.7) | 3915 (3845–3945) | 3430 (3291–3527) |
| analog | 15.1 (15.1–15.2) | 0.73× | 8.3 (8.2–8.3) | 2.6 (2.6–2.6) | 6.9 (6.9–7.0) | 2.37 (2.37–2.45) | – | 2687 (2639–2699) | 2253 (2221–2266) |
| analog-aot | 12.7 (12.7–12.8) | 0.61× | 8.9 (8.9–8.9) | 1.7 (1.6–1.7) | 4.4 (4.4–4.5) | 0.97 (0.94–0.98) | – | 2828 (2752–2834) | 2336 (2331–2338) |
| analog-fast | 11.5 (11.4–11.6) | 0.55× | 7.6 (7.6–7.7) | 1.7 (1.7–1.7) | 4.5 (4.4–4.5) | 0.95 (0.93–0.97) | – | 2360 (2333–2433) | 1881 (1821–1943) |
| angular-build | 12.9 (12.9–13.0) | 0.62× | 9.1 (9.1–9.2) | 1.7 (1.7–1.7) | 4.4 (4.4–4.4) | 0.94 (0.94–0.95) | – | 3134 (3067–3251) | 2678 (2645–2724) |
| angular-build-jit | 15.1 (14.9–15.5) | 0.72× | 8.3 (8.2–8.5) | 2.6 (2.5–2.7) | 7.0 (6.9–7.3) | 2.36 (2.35–2.42) | – | 2896 (2817–2903) | 2412 (2400–2475) |
| oxc | 8.3 (8.2–8.3) | 0.40× | 4.4 (4.4–4.4) | 1.7 (1.7–1.7) | 4.5 (4.5–4.5) | 0.99 (0.98–0.99) | – | 2767 (2751–2802) | 2288 (2280–2313) |
| swc | 12.1 (12.1–12.2) | 0.58× | 5.2 (5.2–5.2) | 2.6 (2.6–2.6) | 7.2 (7.1–7.2) | 2.36 (2.34–2.43) | – | 2463 (2452–2529) | 2021 (1979–2041) |

## Per-spec durations, full suite

Median per spec: `compile+load / test bodies` in seconds (see methodology for the boundaries).

| spec | regular | analog | analog-aot | analog-fast | angular-build | angular-build-jit | oxc | swc |
|---|---|---|---|---|---|---|---|---|
| app/card/card.cy.ts | 3.70 / 0.07 | 1.11 / 0.07 | 1.10 / 0.07 | 1.11 / 0.07 | 1.07 / 0.07 | 1.09 / 0.07 | 1.11 / 0.06 | 1.15 / 0.07 |
| app/control-flow/control-flow.cy.ts | 1.32 / 0.28 | 1.44 / 0.26 | 1.43 / 0.24 | 1.44 / 0.24 | 1.43 / 0.24 | 1.43 / 0.26 | 1.44 / 0.24 | 1.44 / 0.26 |
| app/counter/counter.cy.ts | 1.32 / 0.59 | 1.29 / 0.59 | 1.30 / 0.57 | 1.00 / 0.57 | 1.27 / 0.57 | 1.26 / 0.59 | 1.27 / 0.57 | 1.26 / 0.59 |
| app/dialog/dialog.cy.ts | 1.54 / 0.52 | 1.34 / 0.52 | 0.98 / 0.50 | 1.34 / 0.50 | 1.01 / 0.50 | 0.97 / 0.52 | 1.52 / 0.50 | 0.98 / 0.50 |
| app/encapsulation/encapsulation.cy.ts | 1.36 / 0.07 | 0.97 / 0.07 | 1.00 / 0.06 | 1.12 / 0.06 | 0.98 / 0.06 | 0.99 / 0.08 | 1.03 / 0.06 | 0.98 / 0.07 |
| app/greeting/greeting.cy.ts | 1.23 / 0.05 | 1.46 / 0.06 | 1.49 / 0.04 | 1.48 / 0.04 | 1.46 / 0.04 | 1.44 / 0.05 | 1.47 / 0.04 | 1.47 / 0.05 |
| app/highlight/highlight.cy.ts | 1.77 / 0.39 | 1.48 / 0.38 | 1.50 / 0.38 | 1.49 / 0.38 | 1.49 / 0.38 | 1.48 / 0.38 | 1.51 / 0.38 | 1.47 / 0.38 |
| app/lib-usage/lib-usage.cy.ts | 1.33 / 0.06 | 1.16 / 0.05 | 1.18 / 0.05 | 1.50 / 0.05 | 1.18 / 0.05 | 1.19 / 0.05 | 1.17 / 0.05 | 1.19 / 0.05 |
| app/pipes/pipes.cy.ts | 1.46 / 0.06 | 1.47 / 0.06 | 1.48 / 0.04 | 1.47 / 0.04 | 1.48 / 0.04 | 1.47 / 0.06 | 1.50 / 0.04 | 1.50 / 0.05 |
| app/router/router.cy.ts | 1.57 / 0.23 | 1.51 / 0.21 | 1.23 / 0.20 | 1.54 / 0.20 | 1.52 / 0.20 | 1.52 / 0.21 | 1.55 / 0.20 | 1.55 / 0.20 |
| app/signup-form/signup-form.cy.ts | 1.34 / 1.66 | 1.32 / 1.65 | 1.34 / 1.63 | 1.32 / 1.63 | 1.32 / 1.63 | 1.31 / 1.65 | 1.31 / 1.64 | 1.36 / 1.64 |
| app/user-list/user-list.cy.ts | 1.34 / 0.37 | 0.89 / 0.36 | 1.34 / 0.34 | 0.88 / 0.34 | 0.87 / 0.34 | 0.92 / 0.37 | 0.92 / 0.34 | 0.91 / 0.35 |
| scale/specs/scale-0.cy.ts | 1.95 / 0.40 | 1.59 / 0.40 | 1.07 / 0.20 | 1.33 / 0.20 | 1.37 / 0.20 | 1.59 / 0.38 | 1.36 / 0.20 | 1.61 / 0.39 |
| scale/specs/scale-1.cy.ts | 1.83 / 0.40 | 1.30 / 0.38 | 1.35 / 0.19 | 1.39 / 0.20 | 1.36 / 0.20 | 1.28 / 0.40 | 1.33 / 0.20 | 1.31 / 0.39 |
| scale/specs/scale-2.cy.ts | 1.77 / 0.39 | 1.28 / 0.39 | 1.34 / 0.20 | 1.33 / 0.20 | 1.36 / 0.20 | 1.28 / 0.39 | 1.35 / 0.20 | 1.32 / 0.39 |

## Per-spec durations, scale fixture with 1000 components

Median per spec: `compile+load / test bodies` in seconds (see methodology for the boundaries).

| spec | regular | analog | analog-aot | analog-fast | angular-build | angular-build-jit | oxc | swc |
|---|---|---|---|---|---|---|---|---|
| scale/specs/scale-0.cy.ts | 6.49 / 0.87 | 2.56 / 0.81 | 1.67 / 0.32 | 1.68 / 0.32 | 1.68 / 0.31 | 2.60 / 0.80 | 1.67 / 0.33 | 2.64 / 0.80 |
| scale/specs/scale-1.cy.ts | 4.12 / 0.82 | 2.26 / 0.80 | 1.41 / 0.32 | 1.41 / 0.32 | 1.41 / 0.31 | 2.29 / 0.81 | 1.44 / 0.33 | 2.32 / 0.80 |
| scale/specs/scale-2.cy.ts | 3.59 / 0.80 | 2.14 / 0.77 | 1.36 / 0.32 | 1.39 / 0.32 | 1.34 / 0.31 | 2.10 / 0.77 | 1.36 / 0.32 | 2.21 / 0.76 |

## Findings

1. **Correctness.**
   - Every setup passes every timed test: 41/41 on the full suite, 6/6 on both scale passes. The timings compare
     the same work.
   - The known gaps (`src/known-gaps`, not timed) split the setups:
     - `analog-aot` and `angular-build` (plain AOT) fail the 2 `TestBed.overrideComponent` tests. AOT output drops
       the decorator TestBed needs to recompile the component, which is why a production monorepo using Analog
       needs `jit: true`. OXC's AOT output keeps the class metadata, so the same overrides pass.
     - `analog-fast` fails 1 of the 2 `TestBed.overrideComponent` tests. It keeps the decorator, so overriding
       providers and the template works, but its `setClassMetadata` call has no `propDecorators`, so the recompiled
       component loses its inputs (analogjs/analog#2666).
     - `oxc` fails the 3 tests of its two open upstream bugs on 0.0.41: `$safeNavigationMigration(item?.id)` in a
       `(click)` handler passes `null` for a `@for` item and for an `@if … as` alias (issue #585, fix in PR #587),
       and a `SafeUrl` bound to a library component's `img [src]` is written out as the literal string
       `SafeValue must use [property]=binding: …` (issue #586, fix in PR #588).
     - `regular`, `analog`, `angular-build-jit` and `swc` pass all 5.
2. **Full suite (41 tests, 15 specs), wall time:**
   - oxc 26.7 s and swc 27.2 s (0.78–0.80× regular)
   - analog-fast 28.5 s (0.83×)
   - analog, analog-aot, angular-build and angular-build-jit 29.4–29.7 s (0.86–0.87×)
   - regular 34.1 s
3. **Most of each Vite spec is fixed Cypress cost, not compiling.** A small spec takes about 0.9–1.5 s from the
   previous spec's end to its first test with every Vite setup (spec iframe reload, support file, module graph
   import). So "compile+load" for the full suite is 19.2–19.5 s for all seven Vite setups. The compiler gaps show up
   in two other places:
   - **Startup.** oxc and swc reach the first test at 3.5 s. analog-fast needs 5.2 s, the other Analog-based setups
     5.8–6.5 s and regular 7.4 s. Analog runs an upfront TypeScript/Angular program analysis that grows with project
     size (2.1–2.7 s more from 300 to 1000 components). analog-fast replaces the program with a lighter scan of every
     file, but still grows by 2.4 s. oxc (+0.9 s) and swc (+1.3 s) transform file by file and grow much less.
   - **In-browser JIT.** The JIT setups (regular, analog, angular-build-jit, swc) compile templates in the browser on
     first mount. Their scale-spec test bodies take about 2× longer than with the AOT setups (oxc, analog-aot,
     analog-fast, angular-build): 1.2 s vs 0.6 s at 300 components, 2.4–2.5 s vs 0.9–1.0 s at 1000. At 1000
     components the Vite JIT setups' compile+load is also 6.9–7.2 s, against 4.4–4.5 s.
4. **The compile-heavy fixture separates the setups.** At 1000 components the wall times are:
   - oxc 8.3 s (0.40× regular)
   - analog-fast 11.5 s (0.55×), swc 12.1 s (0.58×), analog-aot 12.7 s and angular-build 12.9 s, close together
   - analog 15.1 s and angular-build-jit 15.1 s
   - regular 20.8 s

   swc's fast startup is cancelled out by the in-browser JIT cost. The AOT setups without OXC's fast startup are
   held back by Analog's upfront analysis, which analog-fast shortens but does not remove.
5. **`@angular/build`'s compilation API vs Analog's own compiler.** In the same mode the CLI pipeline is about as
   fast: 2–6% slower to the first test (6.6 s vs 6.2 s AOT at 300 components, 9.1 s vs 8.9 s at 1000). It uses
   9–15% more peak PSS (2.38 vs 2.18 GB AOT on the full suite, 2.68 vs 2.34 GB at 1000 components, 2.41 vs 2.12 GB
   in JIT mode at 300).
6. **regular (webpack)** compiles about 4.7 s up front. Then, with Cypress's default `justInTimeCompile`, it
   recompiles before every spec (16 compiles summing 11.1 s for the full suite, 13.7 s for scale-1000). That adds
   about 0.3–0.5 s per spec on top of the same ~1.3 s per-spec floor the Vite setups have.
7. **Memory (peak PSS of the process tree).**
   - regular: 3.0–3.7 GB, the most in every pass.
   - Vite setups: 1.71–2.68 GB. analog-fast is the lowest (1.71–1.88 GB), then swc (1.89–2.02 GB). The other
     analog setups and oxc are close behind (2.11–2.34 GB).
   - `@angular/build` setups: the highest of the Vite setups (2.29–2.68 GB).
8. **OXC does not link the pre-bundled npm packages on Vite 7.** Its linker hooks into the optimizer through
   `optimizeDeps.rolldownOptions`, which Vite 7's esbuild optimizer ignores. After an oxc run,
   `.cypress-vite/oxc/deps` still holds 16 `ɵɵngDeclareComponent` calls (CDK). They are JIT-linked in the browser,
   which is why the support file's `@angular/compiler` import is still required with oxc. Non-pre-bundled
   `node_modules` packages, such as `sandbox-ui-lib`, do go through OXC's transform-time linker. That is the path
   where issue #586 lives.

### Caveats

- The specs are small, so Cypress's fixed per-spec cost (≈1 s) dominates and squeezes the compiler differences.
  Suites with heavier components or bigger import graphs per spec should look more like the scale-1000 pass.
- One session, one machine, 3 cold runs per setup, warm OS page cache, other desktop software running. The min–max
  ranges are tight (mostly under 3%), but treat differences under about 10% as noise.
- `regular` only runs after the two workarounds below. Out of the box, Cypress 15.17's Angular webpack support
  cannot run any spec on Angular 22.

## Methodology

- **Machine:** AMD Ryzen 9 9950X3D (16 cores / 32 threads), 59 GB RAM, Linux 7.0, Node 24.18.1 on the host. Cypress runs its
  config process on that Node and uses its bundled Electron 37.6.0 (headless) as the browser. Other desktop software
  was running, so expect a few percent of noise.
- **Runner:** `scripts/bench.mjs` spawns `node_modules/.bin/cypress run --component --spec <group>` once per run. It
  never runs more than one Cypress process at a time. Setup order rotates per run, so no setup always goes first.
- **Cold runs:** before every run the script deletes `.angular/` (the webpack persistent cache, about 130 MB),
  `.cypress-vite/` (Vite `cacheDir`, including the optimizeDeps pre-bundle), `node_modules/.vite`,
  `node_modules/.cache` (which holds Analog's cache), `.tmp/cypress-angular-ct`, `out-tsc` and `.swc/` (SWC's Wasm plugin cache). The OS page cache stays warm: dropping it needs
  root, and it is equally warm for every setup.
- **Spec groups:** `all` = 12 hand-written specs plus the 3 generated scale specs (35 + 6 = 41 tests). `scale` = the 3
  scale specs alone. `scale-n1000` = the same 3 specs regenerated with 1000 components. Every setup passes every test
  of these groups, so the timings compare the same work. `gaps` = `src/known-gaps` (3 specs, 5 tests): what some
  setups can't do (`TestBed.overrideComponent` under plain AOT and `fastCompile`, two open OXC bugs). It runs once per setup and stays
  out of every timing table, since a failing test waits for the 10 s `defaultCommandTimeout`.
- **Scale fixture:** `scripts/generate-scale.mjs N` writes N standalone components in chains of 10. Each one has
  `templateUrl` + `styleUrl` (SCSS with `sass:math`), three signal inputs, an `output()`, two `computed()`s,
  `@switch`/`@for`/`@if` and the `uppercase` pipe, and imports the next component in its chain. Three root components
  import ⅓ of the chain heads each, and each scale spec mounts one root and checks every node rendered.
- **Timings:** all from node-side `Date.now()` stamps that `cypress.config.ts` appends to a JSONL file
  (`BENCH_EVENTS`), relative to the moment the bench spawned Cypress:
  - **wall**: spawn until the Cypress process exits.
  - **to first test**: spawn until the first spec's first test starts. The support file has a global `before()`
    that calls `cy.task('bench:mark')`. It runs only after the spec bundle has been compiled, served and evaluated.
    This covers Cypress boot, config load, dev-server start, Vite optimizeDeps or the webpack initial compile, browser
    launch and compiling the first spec.
  - **first-spec load**: from `before:run` to that first `before()` hook. It is the dev-server compile/bundle time
    before the first spec runs (it also includes browser launch, about 0.7 s for every setup).
  - **compile+load (all specs)**: for each spec, the time from the previous spec's `after:spec` (`before:run` for the
    first spec) to its first `before()` hook, summed over all specs. This boundary is needed for webpack: with
    Cypress's default `justInTimeCompile`, webpack compiles the next spec after the previous `after:spec` and before the
    next `before:spec`, so a `before:spec`→`after:spec` window would miss its compile. For Vite, this gap covers the
    on-demand transform of the spec's module graph.
  - **test bodies**: the sum of Mocha test durations as Cypress reports them (`after:spec` results).
  - **webpack compile (sum)**: the sum of `stats.endTime - stats.startTime` over every webpack `done` hook (a plugin
    added through `webpackConfig`). It has no Vite counterpart, because Vite transforms on request.
- **Memory:** every 1 s the bench walks `/proc/*/stat` to find every descendant of the spawned process (Cypress
  CLI → Electron main → zygotes/renderers/GPU → config/dev-server Node process). It records the sum of RSS and the sum
  of PSS (`/proc/<pid>/smaps_rollup`). RSS double-counts pages shared between Electron processes. PSS splits shared
  pages between the processes and is the better total. Peaks are the largest 1 s sample, so a spike shorter than 1 s
  can be missed.
- **Statistics:** the median of 3 cold runs, with min–max. 3 runs is enough to show differences of 2× or more. It is not
  enough to rank setups that are within about 10% of each other.

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

### analog / analog-aot / analog-fast / angular-build / angular-build-jit / oxc / swc (Vite)

- Same Vite config for all seven. Only the Angular plugin differs. It uses a production monorepo's `optimizeDeps`
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
- `analog-aot` (`jit: false`) fails `TestBed.overrideComponent` (the 2 tests in `src/known-gaps/override-component.cy.ts`).
  AOT strips the decorator TestBed needs to recompile the component. This is why a production monorepo using Analog
  sets `jit: true`.
- `analog-fast` (`jit: false, fastCompile: true`): no workaround needed. It fails 1 of the 2
  `TestBed.overrideComponent` tests: overriding providers and the template works, but the recompiled component loses
  its inputs. `fastCompile` emits `setClassMetadata(…, null, null)`, with no `propDecorators` or `ctorParameters`
  ([analogjs/analog#2666](https://github.com/analogjs/analog/issues/2666), still in 2.9.0).

- `angular-build` / `angular-build-jit`: no workaround needed. Analog already loads `@angular/build/private`
  (`createAngularCompilation`) itself. `@angular/build@22.2.0` was made a direct, pinned devDependency anyway, so
  the version is explicit. It resolves to the same copy build-angular uses. `angular-build` (AOT) fails the same 2
  `TestBed.overrideComponent` tests as `analog-aot`. `angular-build-jit` passes them.
- `swc`: `unplugin-swc` with `swcAngularUnpluginOptions()` and default options, in place of an Angular plugin.
  The preset's SWC plugin rewrites `templateUrl` into an `import … from './x.html?raw'` and `styleUrl` into a
  `./x.scss?inline` import. Vite handles both natively, including SCSS through `sass`. The template is then compiled
  in the browser by `@angular/compiler`. Two additions, both only for this setup:
  - a separate support file, `cypress/support/component-swc.ts`, that imports `reflect-metadata` before the shared
    support file. The preset emits legacy decorators with `design:paramtypes` metadata, and its README requires
    `reflect-metadata` for constructor injection. The other setups don't load it.
  - `reflect-metadata` added to `optimizeDeps.include`. It is a UMD/CommonJS script, and with `noDiscovery` it
    would otherwise be served unbundled.

  `useDefineForClassFields: false` (the README's fallback for property-inheritance issues) was not needed: every spec
  passes with the defaults. `@swc/core` is pinned to 1.15.8 because the preset exits at load time on any other minor
  (peer `~1.15.0`). pnpm's `allowBuilds` has to allow `@swc/core`'s postinstall. The SWC plugin cache (`.swc/`, about
  7 MB of compiled Wasm) is deleted before every cold run like the other caches.

### Spec-level notes (all setups)

- Router spec: TestBed never bootstraps an app, so the spec calls `router.navigateByUrl('/')` after mount and uses
  `withHashLocation()` so navigation does not change the spec iframe's path.
- Card spec: the `ng-content` fallback text is compared after trimming. Whitespace around projected fallback content is
  not something this comparison should depend on.

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

## Raw data

- `results/runs.jsonl`: one line per Cypress run (summary, per-spec rows, 1 s memory series).
- `results/raw/<pass>/<setup>-<run>.events.jsonl`: node-side event timestamps written by `cypress.config.ts`.
- `results/summary.json`: the aggregates used for these tables.
- `results/regular-*.log`: the two errors the regular setup hits without workarounds.
