// Builds results/summary.json and results/RESULTS.md from results/runs.jsonl.
// Static narrative (versions, methodology, workarounds, findings) lives in results/notes/*.md and is
// spliced in, so the tables can be regenerated without losing it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = path.join(root, 'results');
const runs = fs
  .readFileSync(path.join(results, 'runs.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const SETUP_ORDER = ['regular', 'analog', 'analog-aot', 'oxc'];
const PASS_ORDER = ['all', 'scale', 'scale-n1000', 'bugs'];
const by = (xs, key) => xs.reduce((m, x) => m.set(x[key], [...(m.get(x[key]) ?? []), x]), new Map());
const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const stat = (xs) => {
  const v = xs.filter((x) => x != null);
  return v.length ? { median: median(v), min: Math.min(...v), max: Math.max(...v), n: v.length } : null;
};
const fmt = (st, digits = 1, unit = '') =>
  st ? `${st.median.toFixed(digits)}${unit} (${st.min.toFixed(digits)}–${st.max.toFixed(digits)})` : '–';
const ratio = (a, b) => (a && b ? `${(a.median / b.median).toFixed(2)}×` : '–');

const passes = by(runs, 'pass');
const summary = {};
for (const pass of PASS_ORDER.filter((p) => passes.has(p))) {
  summary[pass] = {};
  const bySetup = by(passes.get(pass), 'setup');
  for (const setup of SETUP_ORDER.filter((s) => bySetup.has(s))) {
    const rs = bySetup.get(setup);
    const specs = by(rs.flatMap((r) => r.perSpec), 'spec');
    summary[pass][setup] = {
      runs: rs.length,
      exitCodes: rs.map((r) => r.exitCode),
      wall_s: stat(rs.map((r) => r.wall_s)),
      before_run_s: stat(rs.map((r) => r.before_run_s)),
      first_test_s: stat(rs.map((r) => r.first_test_s)),
      first_spec_load_s: stat(rs.map((r) => r.first_spec_load_s)),
      load_total_s: stat(rs.map((r) => r.load_total_s)),
      tests_total_s: stat(rs.map((r) => r.tests_total_s)),
      webpack_compile_total_s: stat(rs.map((r) => r.webpack_compile_total_s)),
      webpack_first_compile_s: stat(rs.map((r) => r.webpack_first_compile_s)),
      peak_rss_mb: stat(rs.map((r) => r.peak_rss_mb)),
      peak_pss_mb: stat(rs.map((r) => r.peak_pss_mb)),
      tests: rs.map((r) => r.totals),
      failures: [...new Set(rs.flatMap((r) => r.perSpec.flatMap((s) => s.failures.map((f) => `${s.spec} › ${f.title} — ${f.error}`))))],
      perSpec: Object.fromEntries(
        [...specs].map(([spec, xs]) => [
          spec,
          { load_s: stat(xs.map((x) => x.load_s)), tests_s: stat(xs.map((x) => x.tests_s)), slot_s: stat(xs.map((x) => x.slot_s)) },
        ]),
      ),
    };
  }
}
fs.writeFileSync(path.join(results, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

const note = (name) => {
  const p = path.join(results, 'notes', `${name}.md`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() + '\n' : '';
};

const lines = [];
const push = (...xs) => lines.push(...xs);
push('# CCT compiler comparison: results', '', note('intro'));

push('## Pass/fail per setup', '');
push('| setup | all (hand-written + scale-300) | scale-300 | scale-1000 | known-oxc-bugs |', '|---|---|---|---|---|');
for (const setup of SETUP_ORDER) {
  const cell = (pass) => {
    const s = summary[pass]?.[setup];
    if (!s) return '–';
    const t = s.tests;
    const passed = t.map((x) => x.passed);
    const failed = t.map((x) => x.failed);
    const same = new Set(passed).size === 1 && new Set(failed).size === 1;
    const base = same ? `${passed[0]}/${t[0].tests} passed` : `passed ${passed.join('/')} of ${t[0].tests}`;
    return failed.some((f) => f > 0) ? `**${base}, ${same ? failed[0] : failed.join('/')} failed**` : base;
  };
  push(`| ${setup} | ${cell('all')} | ${cell('scale')} | ${cell('scale-n1000')} | ${cell('bugs')} |`);
}
push('', 'Pending and skipped were 0 in every run. Failures (all runs, de-duplicated):', '');
for (const pass of PASS_ORDER) {
  for (const setup of SETUP_ORDER) {
    for (const f of summary[pass]?.[setup]?.failures ?? []) push(`- \`${setup}\` / ${pass}: ${f.replace(/\|/g, '\\|')}`);
  }
}
push('');

const timingTable = (pass, title) => {
  const s = summary[pass];
  if (!s) return;
  const runsN = Math.max(...Object.values(s).map((x) => x.runs));
  push(`## ${title}`, '', `Median (min–max) of ${runsN} cold runs per setup. Times in seconds, memory in MB.`, '');
  push(
    '| setup | wall | vs regular | to first test | first-spec load | compile+load (all specs) | test bodies | webpack compile (sum) | peak RSS (tree) | peak PSS (tree) |',
    '|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const setup of SETUP_ORDER.filter((x) => s[x])) {
    const r = s[setup];
    push(
      `| ${setup} | ${fmt(r.wall_s)} | ${ratio(r.wall_s, s.regular?.wall_s)} | ${fmt(r.first_test_s)} | ${fmt(r.first_spec_load_s)} | ${fmt(r.load_total_s)} | ${fmt(r.tests_total_s, 2)} | ${fmt(r.webpack_compile_total_s)} | ${fmt(r.peak_rss_mb, 0)} | ${fmt(r.peak_pss_mb, 0)} |`,
    );
  }
  push('');
};
timingTable('all', 'Full suite (hand-written specs + scale fixture of 300 components, bugs excluded)');
timingTable('scale', 'Scale fixture alone, 300 generated components (3 specs)');
timingTable('scale-n1000', 'Scale fixture alone, 1000 generated components (3 specs)');

const perSpecTable = (pass, title) => {
  const s = summary[pass];
  if (!s) return;
  const setups = SETUP_ORDER.filter((x) => s[x]);
  const specs = [...new Set(setups.flatMap((x) => Object.keys(s[x].perSpec)))].sort();
  push(`## ${title}`, '', 'Median per spec: `compile+load / test bodies` in seconds (see methodology for the boundaries).', '');
  push(`| spec | ${setups.join(' | ')} |`, `|---|${setups.map(() => '---').join('|')}|`);
  for (const spec of specs) {
    push(
      `| ${spec.replace(/^src\//, '')} | ${setups
        .map((x) => {
          const p = s[x].perSpec[spec];
          return p ? `${p.load_s?.median?.toFixed(2) ?? '–'} / ${p.tests_s?.median?.toFixed(2) ?? '–'}` : '–';
        })
        .join(' | ')} |`,
    );
  }
  push('');
};
perSpecTable('all', 'Per-spec durations, full suite');
perSpecTable('scale-n1000', 'Per-spec durations, scale fixture with 1000 components');

push(note('findings'), note('methodology'), note('workarounds'), note('versions'));
push('## Raw data', '', '- `results/runs.jsonl`: one line per Cypress run (summary, per-spec rows, 1 s memory series).');
push('- `results/raw/<pass>/<setup>-<run>.events.jsonl`: node-side event timestamps written by `cypress.config.ts`.');
push('- `results/summary.json`: the aggregates used for these tables.');
push('- `results/regular-*.log`: the two errors the regular setup hits without workarounds.', '');
fs.writeFileSync(path.join(results, 'RESULTS.md'), lines.join('\n').replace(/\n{3,}/g, '\n\n'));
console.log('wrote results/RESULTS.md and results/summary.json');
