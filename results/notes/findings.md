## Findings

1. **Correctness.** `regular` and `analog` pass everything, including the two known-bug specs. `oxc` passes all
   43 main tests and fails exactly the 3 known-bug tests. Both upstream bugs reproduce on 0.0.41:
   `$safeNavigationMigration(item?.id)` in a `(click)` handler passes `null` for a `@for` item and for an `@if … as`
   alias (#587). A `SafeUrl` bound to a library component's `img [src]` is written out as the literal string
   `SafeValue must use [property]=binding: …` (#588). `analog-aot` fails the 2 `TestBed.overrideComponent` tests,
   which confirms why a production monorepo using Analog needs `jit: true`. OXC's AOT output keeps the class metadata, so the
   same overrides pass.
2. **Full suite (43 tests, 14 specs):** oxc 27.0 s, analog 29.6 s, regular 34.2 s. That makes oxc 0.79× regular
   and 0.91× analog. analog-aot's 49.2 s includes 2 × 10 s of failing-assertion timeouts. Without them it lands
   around 29 s.
3. **Most of each Vite spec is fixed Cypress cost, not compiling.** A tiny spec takes about 0.9–1.5 s from the
   previous spec's end to its first test with every Vite setup (spec iframe reload, support file, module graph
   import). So "compile+load" for the full suite is about 19.5 s for analog, analog-aot and oxc alike. The
   compiler gaps show up in two other places:
   - **Startup.** oxc reaches the first test at 3.5 s, analog at 5.8 s, analog-aot at 6.3 s and regular at 7.3 s.
     Analog's startup grows with project size: 6.0 s → 8.5 s from 300 to 1000 generated components. OXC barely
     moves (3.7 s → 4.5 s).
   - **In-browser JIT.** With the JIT setups (regular, analog) the scale specs spend 2× longer in test bodies: 0.39 s
     vs 0.20 s per spec at 300 components, and 2.4 s vs 1.0 s for the 1000-component pass. The components are
     compiled in the browser when first mounted. At 1000 components analog's compile+load is also 7.3 s, against
     4.6 s for both AOT setups.
4. **The compile-heavy fixture widens the gap.** With 1000 components, oxc takes 8.5 s against analog's 15.6 s
   (0.55×) and regular's 20.9 s (0.41×). With 300 components it is 7.3 s against 9.9 s and 13.6 s.
5. **regular (webpack)** compiles about 4 s up front. Then, with Cypress's default `justInTimeCompile`, it
   recompiles before every spec (sum of webpack compiles: 10.8 s for the full suite, 13.7 s for scale-1000). That
   adds about 0.3–0.5 s per spec on top of the same ~1.3 s per-spec floor the Vite setups have.
6. **Memory.** regular peaks at about 3.5 GB PSS (4.0 GB summed RSS) for the process tree. The Vite setups peak at
   2.1–2.3 GB PSS, so regular uses about 1.3 GB (≈60%) more. Among the Vite setups oxc is within about 5% of analog
   (2.22 vs 2.08 GB on the full suite, 2.33 vs 2.22 GB at 1000 components).
7. **OXC does not link the pre-bundled npm packages on Vite 7.** Its linker hooks into the optimizer through
   `optimizeDeps.rolldownOptions`, which Vite 7's esbuild optimizer ignores. After an oxc run,
   `.cypress-vite/oxc/deps` still holds 16 `ɵɵngDeclareComponent` calls (CDK). They are JIT-linked in the browser,
   which is why the support file's `@angular/compiler` import is still required with oxc. Non-pre-bundled
   `node_modules` packages, such as `sandbox-ui-lib`, do go through OXC's transform-time linker. That is the path
   where bug #588 lives.

### Caveats

- The specs are small, so Cypress's fixed per-spec cost (≈1 s) dominates and squeezes the compiler differences.
  Suites with heavier components or bigger import graphs per spec should look more like the scale-1000 pass.
- One machine, 3 cold runs per setup, warm OS page cache, other desktop software running. The min–max ranges are
  tight (mostly under 3%), but treat differences under about 10% as noise.
- `regular` only runs after the two workarounds below. Out of the box, Cypress 15.17's Angular webpack support
  cannot run any spec on Angular 22.
