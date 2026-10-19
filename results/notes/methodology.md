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
