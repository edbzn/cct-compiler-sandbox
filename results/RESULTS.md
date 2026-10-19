# CCT compiler comparison: results

Angular 22.2.0 Cypress Component Testing (Cypress 15.17.0) run under seven compiler setups, all with the same
specs and components. Every run is cold: compiler and dev-server caches are deleted first. Runs are strictly sequential.

| setup | dev server | Angular compilation |
|---|---|---|
| `regular` | Cypress `framework: 'angular', bundler: 'webpack'`: angular.json + `@angular-devkit/build-angular` webpack config, with Cypress's default `justInTimeCompile` | JIT (Cypress forces `aot: false`), `@ngtools/webpack` + Babel |
| `analog` | Cypress `framework: 'angular', bundler: 'vite'` + `viteConfig` | `@analogjs/vite-plugin-angular` `{ jit: true }` (a production monorepo's setting) |
| `analog-aot` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false }` |
| `angular-build` | same Vite config | `@analogjs/vite-plugin-angular` `{ jit: false, experimental: { useAngularCompilationAPI: true } }`: compiles through `@angular/build`'s `createAngularCompilation`, the AOT pipeline of the Angular CLI's esbuild builder |
| `angular-build-jit` | same Vite config | same, `{ jit: true }` (TestBed override parity) |
| `oxc` | same Vite config | `@oxc-angular/vite` (AOT, emits class metadata) |
| `swc` | same Vite config | `unplugin-swc` + `@jscutlery/swc-angular` preset in place of an Angular plugin: SWC strips types and decorators, templates compile at runtime (JIT) |

`regular` needs two workarounds before it runs on Angular 22 (see "Setup-specific workarounds"). Without them it cannot run any spec.

The `angular-build*` and `swc` setups were added in a second benchmark session later the same day. An `oxc`
control re-run checks that both sessions are comparable (see "Control").

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

| setup | all (hand-written + scale-300) | scale-300 | scale-1000 | known-oxc-bugs |
|---|---|---|---|---|
| regular | 43/43 passed | 6/6 passed | 6/6 passed | 3/3 passed |
| analog | 43/43 passed | 6/6 passed | 6/6 passed | 3/3 passed |
| analog-aot | **41/43 passed, 2 failed** | 6/6 passed | 6/6 passed | 3/3 passed |
| angular-build | **41/43 passed, 2 failed** | 6/6 passed | 6/6 passed | 3/3 passed |
| angular-build-jit | 43/43 passed | 6/6 passed | 6/6 passed | 3/3 passed |
| oxc | 43/43 passed | 6/6 passed | 6/6 passed | **0/3 passed, 3 failed** |
| swc | 43/43 passed | 6/6 passed | 6/6 passed | 3/3 passed |

Pending and skipped were 0 in every run. Failures (all runs, de-duplicated):

- `analog-aot` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-19T15:54:30.608Z'
- `analog-aot` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces the template — AssertionError: Timed out retrying after 10000ms: Expected to find element: `[data-cy=override]`, but never found it.
- `analog-aot` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-19T15:56:17.927Z'
- `analog-aot` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-19T15:58:06.791Z'
- `angular-build` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-19T16:24:23.135Z'
- `angular-build` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces the template — AssertionError: Timed out retrying after 10000ms: Expected to find element: `[data-cy=override]`, but never found it.
- `angular-build` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-19T16:27:07.258Z'
- `angular-build` / all: src/app/greeting/greeting.cy.ts › GreetingComponent (TestBed overrides) > overrideComponent replaces component-level providers — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text 'frozen-time', but the text was '2026-10-19T16:28:23.954Z'
- `oxc` / bugs: src/known-oxc-bugs/library-safe-url.cy.ts › known-oxc-bugs: SafeUrl bound to a library img [src] (#588) > unwraps the SafeUrl and loads the image — AssertionError: Timed out retrying after 10000ms: expected '<img>' to have attribute 'src' with the value 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', but the value was 'SafeValue must use [property]=binding: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg== (see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss)'
- `oxc` / bugs: src/known-oxc-bugs/safe-navigation-event.cy.ts › known-oxc-bugs: $safeNavigationMigration in event bindings (#587) > passes the @for item value to the handler — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text '2', but the text was 'null'
- `oxc` / bugs: src/known-oxc-bugs/safe-navigation-event.cy.ts › known-oxc-bugs: $safeNavigationMigration in event bindings (#587) > passes the @if-as alias value to the handler — AssertionError: Timed out retrying after 10000ms: expected '<p>' to have text '7', but the text was 'null'

## Full suite (hand-written specs + scale fixture of 300 components, bugs excluded)

Median (min–max) of 3 cold runs per setup. Times in seconds, memory in MB.

| setup | wall | vs regular | to first test | first-spec load | compile+load (all specs) | test bodies | webpack compile (sum) | peak RSS (tree) | peak PSS (tree) |
|---|---|---|---|---|---|---|---|---|---|
| regular | 34.2 (33.8–34.2) | 1.00× | 7.3 (7.3–7.4) | 4.2 (3.7–4.3) | 25.5 (24.6–25.5) | 5.55 (5.54–5.57) | 10.8 (10.7–10.8) | 4007 (3869–4221) | 3485 (3449–3626) |
| analog | 29.6 (29.6–29.7) | 0.87× | 5.8 (5.7–5.8) | 1.2 (1.2–1.2) | 19.5 (19.5–19.5) | 5.49 (5.48–5.49) | – | 2535 (2534–2536) | 2078 (2076–2100) |
| analog-aot | 49.2 (49.2–49.3) | 1.44× | 6.3 (6.2–6.4) | 1.1 (1.1–1.2) | 18.9 (18.9–19.0) | 24.75 (24.74–24.76) | – | 2685 (2585–2760) | 2185 (2169–2295) |
| angular-build | 49.4 (49.4–49.7) | 1.44× | 6.5 (6.4–6.7) | 1.1 (1.1–1.1) | 18.9 (18.8–18.9) | 24.75 (24.75–24.76) | – | 2908 (2869–2924) | 2431 (2415–2464) |
| angular-build-jit | 29.9 (29.8–29.9) | 0.87× | 5.9 (5.8–5.9) | 1.2 (1.2–1.2) | 19.5 (19.5–19.7) | 5.49 (5.49–5.52) | – | 2841 (2736–2856) | 2370 (2343–2407) |
| oxc | 27.0 (27.0–27.1) | 0.79× | 3.5 (3.5–3.6) | 1.2 (1.2–1.2) | 19.6 (19.6–19.7) | 4.72 (4.70–4.72) | – | 2677 (2674–2683) | 2217 (2210–2233) |
| swc | 27.5 (27.4–27.6) | 0.80× | 3.5 (3.4–3.5) | 1.2 (1.2–1.2) | 19.7 (19.6–19.8) | 5.38 (5.37–5.38) | – | 2518 (2457–2548) | 2041 (1992–2059) |

## Scale fixture alone, 300 generated components (3 specs)

Median (min–max) of 3 cold runs per setup. Times in seconds, memory in MB.

| setup | wall | vs regular | to first test | first-spec load | compile+load (all specs) | test bodies | webpack compile (sum) | peak RSS (tree) | peak PSS (tree) |
|---|---|---|---|---|---|---|---|---|---|
| regular | 13.6 (13.6–13.8) | 1.00× | 8.3 (8.2–8.3) | 4.6 (4.5–5.2) | 8.8 (8.7–9.3) | 1.19 (1.19–1.20) | 8.1 (8.1–8.2) | 3447 (3254–3490) | 3023 (2899–3093) |
| analog | 9.9 (9.9–10.1) | 0.73× | 6.0 (6.0–6.1) | 1.7 (1.6–1.7) | 4.3 (4.3–4.4) | 1.18 (1.16–1.18) | – | 2455 (2432–2671) | 2075 (2056–2082) |
| analog-aot | 9.9 (9.9–10.0) | 0.73× | 6.3 (6.3–6.3) | 1.3 (1.3–1.4) | 4.0 (4.0–4.1) | 0.60 (0.59–0.60) | – | 2558 (2510–2664) | 2183 (2145–2186) |
| angular-build | 10.6 (10.4–10.7) | 0.78× | 6.9 (6.7–7.0) | 1.4 (1.4–1.4) | 4.1 (4.1–4.1) | 0.61 (0.60–0.62) | – | 2839 (2779–2839) | 2366 (2350–2400) |
| angular-build-jit | 10.5 (10.5–10.9) | 0.77× | 6.5 (6.5–6.8) | 1.8 (1.7–1.9) | 4.5 (4.4–4.7) | 1.21 (1.18–1.22) | – | 2916 (2758–2976) | 2420 (2284–2470) |
| oxc | 7.3 (7.2–7.3) | 0.53× | 3.7 (3.6–3.7) | 1.4 (1.4–1.4) | 4.0 (4.0–4.1) | 0.60 (0.60–0.60) | – | 2511 (2504–2516) | 2133 (2126–2137) |
| swc | 8.1 (8.0–8.2) | 0.60× | 4.0 (4.0–4.1) | 1.7 (1.7–1.8) | 4.5 (4.4–4.6) | 1.19 (1.19–1.23) | – | 2343 (2283–2387) | 1933 (1878–1961) |

## Scale fixture alone, 1000 generated components (3 specs)

Median (min–max) of 3 cold runs per setup. Times in seconds, memory in MB.

| setup | wall | vs regular | to first test | first-spec load | compile+load (all specs) | test bodies | webpack compile (sum) | peak RSS (tree) | peak PSS (tree) |
|---|---|---|---|---|---|---|---|---|---|
| regular | 20.9 (20.9–21.0) | 1.00× | 10.5 (10.5–10.7) | 7.1 (6.5–7.2) | 14.8 (14.2–15.0) | 2.48 (2.48–2.53) | 13.7 (13.6–13.8) | 3927 (3722–4008) | 3516 (3341–3558) |
| analog | 15.6 (15.3–15.6) | 0.74× | 8.5 (8.4–8.5) | 2.7 (2.7–2.7) | 7.3 (7.1–7.3) | 2.41 (2.41–2.43) | – | 2600 (2584–2784) | 2223 (2206–2321) |
| analog-aot | 12.9 (12.9–13.0) | 0.62× | 9.0 (9.0–9.1) | 1.8 (1.8–1.8) | 4.6 (4.6–4.7) | 0.95 (0.95–0.95) | – | 2695 (2673–2710) | 2318 (2301–2336) |
| angular-build | 13.7 (13.6–13.7) | 0.65× | 9.7 (9.7–9.7) | 1.8 (1.8–1.9) | 4.8 (4.7–4.8) | 0.97 (0.95–0.98) | – | 3241 (3186–3280) | 2746 (2708–2798) |
| angular-build-jit | 16.1 (16.0–16.2) | 0.77× | 8.7 (8.7–8.8) | 2.8 (2.7–2.9) | 7.5 (7.4–7.7) | 2.49 (2.49–2.52) | – | 2983 (2968–3025) | 2499 (2488–2542) |
| oxc | 8.5 (8.4–8.5) | 0.41× | 4.5 (4.5–4.6) | 1.8 (1.8–1.9) | 4.7 (4.6–4.7) | 0.99 (0.99–1.00) | – | 2779 (2772–2835) | 2332 (2274–2372) |
| swc | 12.8 (12.8–13.0) | 0.61× | 5.5 (5.5–5.6) | 2.9 (2.8–2.9) | 7.6 (7.6–7.7) | 2.46 (2.44–2.48) | – | 2567 (2527–2584) | 2068 (1998–2104) |

## Control: drift between the two benchmark sessions

`oxc` was re-run (`all` pass, 3 cold runs) at the end of the second session. That session benchmarked
`angular-build`, `angular-build-jit` and `swc` and started about 20 minutes after the first one ended. Before both
sessions about 40 GB of memory was available, and the load average before the second was about 1.

Session 2 came out 1–5% slower on the timing metrics. Compare session-2 setups (`angular-build*`, `swc`) with session-1
setups with that margin in mind. Differences of 10% or more are real.

| setup | metric | session 1 (`all`) | session 2 (`all-control`) | drift |
|---|---|---|---|---|
| oxc | wall | 27.0 (27.0–27.1) | 27.5 (27.4–27.5) | 1.5% |
| oxc | to first test | 3.5 (3.5–3.6) | 3.7 (3.6–3.7) | 4.7% |
| oxc | compile+load | 19.6 (19.6–19.7) | 19.9 (19.8–19.9) | 1.4% |
| oxc | test bodies | 4.72 (4.70–4.72) | 4.79 (4.77–4.79) | 1.3% |
| oxc | peak PSS (MB) | 2217 (2210–2233) | 2142 (2081–2190) | -3.4% |

## Per-spec durations, full suite

Median per spec: `compile+load / test bodies` in seconds (see methodology for the boundaries).

| spec | regular | analog | analog-aot | angular-build | angular-build-jit | oxc | swc |
|---|---|---|---|---|---|---|---|
| app/card/card.cy.ts | 4.22 / 0.07 | 1.20 / 0.07 | 1.14 / 0.07 | 1.10 / 0.07 | 1.16 / 0.07 | 1.18 / 0.06 | 1.18 / 0.06 |
| app/control-flow/control-flow.cy.ts | 1.35 / 0.28 | 1.46 / 0.26 | 1.45 / 0.24 | 1.46 / 0.24 | 1.46 / 0.27 | 1.46 / 0.24 | 1.47 / 0.26 |
| app/counter/counter.cy.ts | 1.36 / 0.60 | 1.29 / 0.59 | 1.35 / 0.56 | 1.31 / 0.57 | 1.29 / 0.59 | 1.33 / 0.57 | 1.30 / 0.58 |
| app/dialog/dialog.cy.ts | 1.52 / 0.52 | 1.02 / 0.52 | 0.99 / 0.50 | 0.99 / 0.50 | 0.98 / 0.52 | 1.06 / 0.49 | 1.03 / 0.50 |
| app/encapsulation/encapsulation.cy.ts | 1.75 / 0.07 | 0.99 / 0.08 | 1.02 / 0.06 | 1.02 / 0.06 | 1.47 / 0.07 | 0.99 / 0.06 | 0.97 / 0.07 |
| app/greeting/greeting.cy.ts | 1.08 / 0.07 | 1.19 / 0.08 | 1.51 / 20.08 | 1.50 / 20.08 | 1.03 / 0.07 | 1.20 / 0.06 | 1.49 / 0.07 |
| app/highlight/highlight.cy.ts | 1.56 / 0.39 | 1.47 / 0.38 | 1.00 / 0.38 | 0.89 / 0.38 | 1.51 / 0.38 | 1.50 / 0.37 | 1.48 / 0.38 |
| app/lib-usage/lib-usage.cy.ts | 1.46 / 0.06 | 1.46 / 0.05 | 0.91 / 0.05 | 1.20 / 0.05 | 1.19 / 0.05 | 1.49 / 0.05 | 1.18 / 0.05 |
| app/pipes/pipes.cy.ts | 1.52 / 0.06 | 1.50 / 0.06 | 1.51 / 0.05 | 1.49 / 0.04 | 1.47 / 0.06 | 1.53 / 0.04 | 1.48 / 0.05 |
| app/router/router.cy.ts | 1.53 / 0.23 | 1.52 / 0.22 | 1.52 / 0.20 | 1.56 / 0.20 | 1.53 / 0.22 | 1.58 / 0.20 | 1.57 / 0.20 |
| app/signup-form/signup-form.cy.ts | 1.32 / 1.65 | 1.32 / 1.65 | 1.35 / 1.63 | 1.34 / 1.63 | 1.33 / 1.65 | 1.34 / 1.63 | 1.31 / 1.65 |
| app/user-list/user-list.cy.ts | 1.36 / 0.37 | 0.90 / 0.36 | 0.91 / 0.35 | 0.91 / 0.35 | 0.89 / 0.36 | 0.91 / 0.34 | 0.92 / 0.36 |
| scale/specs/scale-0.cy.ts | 1.84 / 0.40 | 1.60 / 0.39 | 1.39 / 0.20 | 1.37 / 0.20 | 1.61 / 0.40 | 1.36 / 0.20 | 1.61 / 0.38 |
| scale/specs/scale-1.cy.ts | 1.79 / 0.39 | 1.30 / 0.39 | 1.37 / 0.20 | 1.35 / 0.19 | 1.30 / 0.39 | 1.38 / 0.20 | 1.32 / 0.38 |
| scale/specs/scale-2.cy.ts | 1.81 / 0.39 | 1.27 / 0.39 | 1.35 / 0.19 | 1.36 / 0.20 | 1.29 / 0.39 | 1.33 / 0.20 | 1.32 / 0.39 |

## Per-spec durations, scale fixture with 1000 components

Median per spec: `compile+load / test bodies` in seconds (see methodology for the boundaries).

| spec | regular | analog | analog-aot | angular-build | angular-build-jit | oxc | swc |
|---|---|---|---|---|---|---|---|
| scale/specs/scale-0.cy.ts | 7.08 / 0.86 | 2.72 / 0.81 | 1.78 / 0.32 | 1.85 / 0.34 | 2.79 / 0.84 | 1.79 / 0.34 | 2.85 / 0.83 |
| scale/specs/scale-1.cy.ts | 4.17 / 0.82 | 2.33 / 0.82 | 1.48 / 0.32 | 1.48 / 0.32 | 2.44 / 0.85 | 1.46 / 0.34 | 2.46 / 0.83 |
| scale/specs/scale-2.cy.ts | 3.59 / 0.81 | 2.19 / 0.78 | 1.38 / 0.31 | 1.45 / 0.31 | 2.29 / 0.82 | 1.42 / 0.32 | 2.31 / 0.80 |

## Findings

1. **Correctness.**
   - `regular`, `analog`, `angular-build-jit` and `swc` pass everything, including the two known-bug specs.
   - `oxc` passes all 43 main tests and fails exactly the 3 known-bug tests. Both upstream bugs reproduce on 0.0.41:
     `$safeNavigationMigration(item?.id)` in a `(click)` handler passes `null` for a `@for` item and for an `@if … as`
     alias (#587). A `SafeUrl` bound to a library component's `img [src]` is written out as the literal string
     `SafeValue must use [property]=binding: …` (#588).
   - The two plain-AOT setups, `analog-aot` and `angular-build`, fail the same 2 `TestBed.overrideComponent` tests.
     This confirms why a production monorepo using Analog needs `jit: true`. OXC's AOT output keeps the class
     metadata, so the same overrides pass.
2. **Full suite (43 tests, 14 specs), wall time:**
   - oxc 27.0 s and swc 27.5 s (0.79–0.80× regular)
   - analog 29.6 s and angular-build-jit 29.9 s (0.87×)
   - regular 34.2 s
   - analog-aot and angular-build are around 49 s, but that includes 2 × 10 s of failing-assertion timeouts. Without
     them both land around 29 s.
3. **Most of each Vite spec is fixed Cypress cost, not compiling.** A tiny spec takes about 0.9–1.5 s from the
   previous spec's end to its first test with every Vite setup (spec iframe reload, support file, module graph
   import). So "compile+load" for the full suite is 18.9–19.7 s for all six Vite setups. The compiler gaps show up
   in two other places:
   - **Startup.** oxc and swc reach the first test at 3.5 s. Analog-based setups need 5.8–6.5 s and regular 7.3 s.
     Analog runs an upfront TypeScript/Angular program analysis that grows with project size (analog 6.0 s → 8.5 s,
     angular-build 6.9 s → 9.7 s from 300 to 1000 components). oxc (3.7 → 4.5 s) and swc (4.0 → 5.5 s) transform
     file by file and grow much less.
   - **In-browser JIT.** The JIT setups (regular, analog, angular-build-jit, swc) compile templates in the browser on
     first mount. Their scale-spec test bodies take about 2× longer than with the AOT setups (oxc, analog-aot,
     angular-build): 1.2 s vs 0.6 s at 300 components, 2.4–2.5 s vs 1.0 s at 1000. At 1000 components the Vite JIT
     setups' compile+load is also 7.3–7.6 s, against 4.6–4.8 s.
4. **The compile-heavy fixture separates the setups.** At 1000 components the wall times are:
   - oxc 8.5 s (0.41× regular)
   - swc 12.8 s (0.61×), analog-aot 12.9 s and angular-build 13.7 s, close together
   - analog 15.6 s and angular-build-jit 16.1 s
   - regular 20.9 s

   swc's fast startup is cancelled out by the in-browser JIT cost. The AOT setups without OXC's fast startup are
   held back by Analog's upfront analysis.
5. **`@angular/build`'s compilation API vs Analog's own compiler.** In the same mode the CLI pipeline comes out
   1–10% slower than Analog's default path. Most of the gap is startup: to first test 6.9 s vs 6.3 s (AOT, 300
   components) and 9.7 s vs 9.0 s (AOT, 1000 components). With the 1–5% session drift, that is a small difference
   at most. It uses noticeably more memory: about 8–18% more peak PSS (2.43 vs 2.19 GB AOT on the full suite, 2.75
   vs 2.32 GB at 1000 components, 2.37 vs 2.08 GB in JIT mode). That is beyond the drift.
6. **regular (webpack)** compiles about 4 s up front. Then, with Cypress's default `justInTimeCompile`, it
   recompiles before every spec (sum of webpack compiles: 10.8 s for the full suite, 13.7 s for scale-1000). That
   adds about 0.3–0.5 s per spec on top of the same ~1.3 s per-spec floor the Vite setups have.
7. **Memory (peak PSS of the process tree).**
   - regular: about 3.5 GB.
   - Vite setups: 1.9–2.8 GB. swc is the lowest (2.0–2.1 GB), with the analog/oxc setups close to it (2.1–2.3 GB).
   - `@angular/build` setups: the highest of the Vite setups (2.3–2.8 GB).
8. **OXC does not link the pre-bundled npm packages on Vite 7.** Its linker hooks into the optimizer through
   `optimizeDeps.rolldownOptions`, which Vite 7's esbuild optimizer ignores. After an oxc run,
   `.cypress-vite/oxc/deps` still holds 16 `ɵɵngDeclareComponent` calls (CDK). They are JIT-linked in the browser,
   which is why the support file's `@angular/compiler` import is still required with oxc. Non-pre-bundled
   `node_modules` packages, such as `sandbox-ui-lib`, do go through OXC's transform-time linker. That is the path
   where bug #588 lives.

### Caveats

- The specs are small, so Cypress's fixed per-spec cost (≈1 s) dominates and squeezes the compiler differences.
  Suites with heavier components or bigger import graphs per spec should look more like the scale-1000 pass.
- Two benchmark sessions on the same day (see "Control": session 2 was 1–5% slower). One machine, 3 cold runs per
  setup, warm OS page cache, other desktop software running. The min–max ranges are
  tight (mostly under 3%), but treat differences under about 10% as noise.
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
- **Spec groups:** `all` = 11 hand-written specs plus the 3 generated scale specs (37 + 6 = 43 tests). `scale` = the 3
  scale specs alone. `scale-n1000` = the same 3 specs regenerated with 1000 components. `bugs` = `src/known-oxc-bugs`
  (3 tests), run once per setup and kept out of every timing table. A failing test waits for the 10 s
  `defaultCommandTimeout`, which would swamp the timings.
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

### analog / analog-aot / angular-build / angular-build-jit / oxc / swc (Vite)

- Same Vite config for all six. Only the Angular plugin differs. It uses a production monorepo's `optimizeDeps`
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
