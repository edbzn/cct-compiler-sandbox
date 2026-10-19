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
