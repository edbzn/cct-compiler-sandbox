// Cold-cache benchmark of the CCT compiler setups. Runs strictly one Cypress process at a time.
//
// Usage: node scripts/bench.mjs [--setups regular,analog,analog-aot,oxc] [--runs 3] [--passes all,scale,bugs]
//                               [--scale-n 300] [--label n1000] [--out results]
//
// Passes (spec groups):
//   all    hand-written specs (src/app) + the generated scale fixture specs; known-oxc-bugs excluded
//   scale  the generated scale fixture specs only (compile-heavy)
//   bugs   src/known-oxc-bugs only, run once per setup (pass/fail matrix, not timed)
//
// Per run it writes <out>/raw/<pass>/<setup>-<run>.events.jsonl (cypress.config.ts BENCH_EVENTS) and
// appends one summary line to <out>/runs.jsonl. Logs go to <out>/logs/ (gitignored).
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const setups = (args.setups ?? 'regular,analog,analog-aot,oxc').split(',');
const runs = Number(args.runs ?? 3);
const passes = (args.passes ?? 'all,scale,bugs').split(',');
const scaleN = Number(args['scale-n'] ?? 300);
const out = path.resolve(root, args.out ?? 'results');
// Optional suffix for the recorded pass name, e.g. --label n1000 records pass "scale-n1000".
const label = args.label;
const tmpDir = path.join(root, '.tmp');

const SPECS = {
  all: ['src/app/**/*.cy.ts', 'src/scale/specs/*.cy.ts'],
  scale: ['src/scale/specs/*.cy.ts'],
  bugs: ['src/known-oxc-bugs/*.cy.ts'],
};
const PASS_RUNS = { bugs: 1 };

// Everything a compiler/dev server may cache between runs.
const COLD_PATHS = ['.angular', '.cypress-vite', 'node_modules/.vite', 'node_modules/.cache', '.tmp/cypress-angular-ct', 'out-tsc'];
const makeCold = () => COLD_PATHS.forEach((p) => fs.rmSync(path.join(root, p), { recursive: true, force: true }));

const PAGE = 4096;
const readProcs = () => {
  const procs = new Map();
  for (const pid of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(pid)) continue;
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      procs.set(Number(pid), { ppid: Number(fields[1]), rssPages: Number(fields[21]) });
    } catch {
      // process exited while scanning
    }
  }
  return procs;
};
const descendants = (procs, rootPid) => {
  const children = new Map();
  for (const [pid, p] of procs) {
    if (!children.has(p.ppid)) children.set(p.ppid, []);
    children.get(p.ppid).push(pid);
  }
  const result = [];
  const stack = [rootPid];
  while (stack.length) {
    const pid = stack.pop();
    if (!procs.has(pid)) continue;
    result.push(pid);
    stack.push(...(children.get(pid) ?? []));
  }
  return result;
};
const pssKb = (pid) => {
  try {
    const m = /^Pss:\s+(\d+) kB/m.exec(fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8'));
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
};

const sampleTree = (rootPid) => {
  const procs = readProcs();
  const pids = descendants(procs, rootPid);
  const rssKb = pids.reduce((sum, pid) => sum + (procs.get(pid).rssPages * PAGE) / 1024, 0);
  const pss = pids.reduce((sum, pid) => sum + pssKb(pid), 0);
  return { n: pids.length, rssKb: Math.round(rssKb), pssKb: pss };
};

const runCypress = ({ setup, pass, passName, run }) =>
  new Promise((resolve) => {
    const rawDir = path.join(out, 'raw', passName);
    const logDir = path.join(out, 'logs', passName);
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(logDir, { recursive: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    const eventsFile = path.join(rawDir, `${setup}-${run}.events.jsonl`);
    const logFile = path.join(logDir, `${setup}-${run}.log`);
    fs.rmSync(eventsFile, { force: true });
    const log = fs.openSync(logFile, 'w');
    const start = Date.now();
    fs.writeFileSync(eventsFile, JSON.stringify({ event: 'bench:spawn', t: start, setup, pass: passName, run }) + '\n');
    const child = spawn(path.join(root, 'node_modules/.bin/cypress'), ['run', '--component', '--spec', SPECS[pass].join(',')], {
      cwd: root,
      env: { ...process.env, CCT_SETUP: setup, BENCH_EVENTS: eventsFile, TMPDIR: tmpDir, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', log, log],
    });
    const samples = [];
    const timer = setInterval(() => samples.push({ t: Date.now() - start, ...sampleTree(child.pid) }), 1000);
    child.on('exit', (code, signal) => {
      clearInterval(timer);
      fs.closeSync(log);
      resolve({ code, signal, start, end: Date.now(), samples, eventsFile, logFile });
    });
  });

const summarize = ({ setup, pass, run, result }) => {
  const events = fs
    .readFileSync(result.eventsFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const t0 = result.start;
  const s = (t) => (t == null ? null : Math.round(t - t0) / 1000);
  const find = (name) => events.find((e) => e.event === name);
  const beforeRun = find('before:run');
  const specs = [];
  let boundary = beforeRun?.t ?? t0;
  for (const e of events) {
    if (e.event === 'before:spec') specs.push({ spec: e.spec, before: e.t, boundary });
    const cur = specs.find((x) => x.spec === e.spec && !x.after);
    if (!cur) continue;
    if (e.event === 'spec:firstTest' && !cur.firstTest) cur.firstTest = e.t;
    if (e.event === 'after:spec') {
      cur.after = e.t;
      cur.stats = e.stats;
      cur.tests = e.tests ?? [];
      boundary = e.t;
    }
  }
  const perSpec = specs.map((x) => {
    const testsMs = x.tests.reduce((sum, t) => sum + (t.duration ?? 0), 0);
    return {
      spec: x.spec,
      // From the previous spec's end (or before:run for the first spec) to this spec's first test:
      // compile/bundle + page load + support file. Webpack (justInTimeCompile) compiles in this gap.
      load_s: x.firstTest ? (x.firstTest - x.boundary) / 1000 : null,
      slot_s: x.after ? (x.after - x.boundary) / 1000 : null,
      tests_s: testsMs / 1000,
      cypress_duration_s: x.stats?.duration != null ? x.stats.duration / 1000 : null,
      passed: x.stats?.passes ?? x.tests.filter((t) => t.state === 'passed').length,
      failed: x.stats?.failures ?? x.tests.filter((t) => t.state === 'failed').length,
      pending: x.stats?.pending ?? 0,
      failures: x.tests.filter((t) => t.state === 'failed').map((t) => ({ title: t.title, error: t.error })),
    };
  });
  const webpackDone = events.filter((e) => e.event === 'webpack:done');
  const afterRun = find('after:run');
  const firstTest = find('spec:firstTest');
  const sum = (xs) => Math.round(xs.reduce((a, b) => a + (b ?? 0), 0) * 1000) / 1000;
  return {
    setup,
    pass,
    run,
    exitCode: result.code,
    signal: result.signal,
    wall_s: (result.end - result.start) / 1000,
    config_loaded_s: s(find('config:loaded')?.t),
    before_run_s: s(beforeRun?.t),
    first_spec_start_s: s(find('before:spec')?.t),
    first_test_s: s(firstTest?.t),
    first_spec_load_s: perSpec[0]?.load_s ?? null,
    vite_listening_s: s(find('vite:listening')?.t),
    webpack_compiles: webpackDone.length,
    webpack_compile_total_s: webpackDone.length ? sum(webpackDone.map((e) => (e.endTime - e.startTime) / 1000)) : null,
    webpack_first_compile_s: webpackDone[0] ? (webpackDone[0].endTime - webpackDone[0].startTime) / 1000 : null,
    load_total_s: sum(perSpec.map((x) => x.load_s)),
    tests_total_s: sum(perSpec.map((x) => x.tests_s)),
    specs: perSpec.length,
    totals: afterRun
      ? { tests: afterRun.totalTests, passed: afterRun.totalPassed, failed: afterRun.totalFailed, pending: afterRun.totalPending, skipped: afterRun.totalSkipped }
      : {
          tests: perSpec.reduce((a, x) => a + x.passed + x.failed + x.pending, 0),
          passed: perSpec.reduce((a, x) => a + x.passed, 0),
          failed: perSpec.reduce((a, x) => a + x.failed, 0),
          pending: perSpec.reduce((a, x) => a + x.pending, 0),
        },
    peak_rss_mb: Math.round(Math.max(0, ...result.samples.map((x) => x.rssKb)) / 1024),
    peak_pss_mb: Math.round(Math.max(0, ...result.samples.map((x) => x.pssKb)) / 1024),
    peak_procs: Math.max(0, ...result.samples.map((x) => x.n)),
    rss_samples: result.samples.length,
    perSpec,
    memorySeries: result.samples.map((x) => [x.t, Math.round(x.rssKb / 1024), Math.round(x.pssKb / 1024), x.n]),
  };
};

const main = async () => {
  fs.mkdirSync(out, { recursive: true });
  execFileSync('node', [path.join(root, 'scripts/generate-scale.mjs'), String(scaleN)], { stdio: 'inherit' });
  const runsFile = path.join(out, 'runs.jsonl');
  const meta = {
    event: 'bench:start',
    at: new Date().toISOString(),
    setups,
    runs,
    passes,
    scaleN,
    label,
    node: process.version,
    cpus: (await import('node:os')).cpus().length,
    memGb: Math.round((await import('node:os')).totalmem() / 2 ** 30),
  };
  fs.appendFileSync(path.join(out, 'bench-meta.jsonl'), JSON.stringify(meta) + '\n');
  for (const pass of passes) {
    const passName = label ? `${pass}-${label}` : pass;
    const passRuns = PASS_RUNS[pass] ?? runs;
    for (let run = 1; run <= passRuns; run++) {
      // Rotate the setup order per run so no setup always goes first/last.
      const order = setups.map((_, i) => setups[(i + run - 1) % setups.length]);
      for (const setup of order) {
        makeCold();
        process.stdout.write(`[${new Date().toISOString()}] ${passName} run ${run}/${passRuns} ${setup} ... `);
        const result = await runCypress({ setup, pass, passName, run });
        const summary = summarize({ setup, pass: passName, run, result });
        fs.appendFileSync(runsFile, JSON.stringify(summary) + '\n');
        console.log(
          `exit ${summary.exitCode} wall ${summary.wall_s}s firstTest ${summary.first_test_s}s load ${summary.load_total_s}s ` +
            `tests ${summary.totals.passed}/${summary.totals.tests} failed ${summary.totals.failed} peakRSS ${summary.peak_rss_mb}MB PSS ${summary.peak_pss_mb}MB`,
        );
      }
    }
  }
  console.log('done; summarize with: node scripts/report.mjs');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
