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
