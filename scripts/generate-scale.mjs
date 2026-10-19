// Generates the compile-heavy scale fixture: SCALE_N components (default 300) arranged as
// chains of CHAIN_LEN (default 10), each chain head imported by one of SCALE_ROOTS (default 3) root
// components, each mounted by one spec in src/scale/specs/. Every component has templateUrl +
// styleUrl (SCSS), signal inputs, an output, computed, @if/@for/@switch, a built-in pipe and imports
// the next component of its chain.
// Usage: node scripts/generate-scale.mjs [N]
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = Number(process.argv[2] ?? process.env.SCALE_N ?? 300);
const CHAIN_LEN = Number(process.env.CHAIN_LEN ?? 10);
const ROOTS = Number(process.env.SCALE_ROOTS ?? 3);
const chains = Math.ceil(N / CHAIN_LEN);
const out = join(root, 'src/scale/generated');
const specsDir = join(root, 'src/scale/specs');

rmSync(out, { recursive: true, force: true });
rmSync(specsDir, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
mkdirSync(specsDir, { recursive: true });

const cls = (c, p) => `ScaleC${c}P${p}Component`;
const sel = (c, p) => `sb-scale-c${c}-p${p}`;
let generated = 0;

for (let c = 0; c < chains; c++) {
  const len = Math.min(CHAIN_LEN, N - c * CHAIN_LEN);
  const dir = join(out, `chain-${c}`);
  mkdirSync(dir, { recursive: true });
  for (let p = 0; p < len; p++) {
    const hasChild = p + 1 < len;
    const base = `cmp-${p}.component`;
    const hue = (c * 37 + p * 11) % 360;
    writeFileSync(
      join(dir, `${base}.ts`),
      `import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
${hasChild ? `import { ${cls(c, p + 1)} } from './cmp-${p + 1}.component';\n` : ''}
export type ScaleMode${c}x${p} = 'compact' | 'full' | 'hidden';

@Component({
  selector: '${sel(c, p)}',
  imports: [UpperCasePipe${hasChild ? `, ${cls(c, p + 1)}` : ''}],
  templateUrl: './${base}.html',
  styleUrl: './${base}.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${cls(c, p)} {
  readonly title = input('chain ${c}');
  readonly depth = input(${p});
  readonly mode = input<ScaleMode${c}x${p}>('full');
  readonly ping = output<string>();
  protected readonly tags = signal(['c${c}', 'p${p}', '${hue}deg']);
  protected readonly isEven = computed(() => this.depth() % 2 === 0);
  protected readonly label = computed(() => \`\${this.title()} / \${this.depth()} / \${this.tags().length}\`);
  protected readonly pings = signal(0);

  onPing(source: string): void {
    this.pings.update((n) => n + 1);
    this.ping.emit(\`${sel(c, p)}<\${source}\`);
  }
}
`,
    );
    writeFileSync(
      join(dir, `${base}.html`),
      `<div class="node" data-cy="scale-node" [class.node--even]="isEven()" [attr.data-depth]="depth()">
  <span class="node__title">{{ label() | uppercase }}</span>
  @switch (mode()) {
    @case ('compact') { <small>compact</small> }
    @case ('hidden') { }
    @default {
      <ul class="node__tags">
        @for (tag of tags(); track tag; let i = $index) {
          <li [attr.data-i]="i">{{ tag }}</li>
        }
      </ul>
    }
  }
  <button type="button" class="node__ping" (click)="onPing('self')">ping {{ pings() }}</button>
${
  hasChild
    ? `  @if (mode() !== 'hidden') {
    <${sel(c, p + 1)} [title]="title()" [depth]="depth() + 1" [mode]="mode()" (ping)="onPing($event)" />
  }`
    : `  <b class="node__leaf" data-cy="scale-leaf">leaf ${c}</b>`
}
</div>
`,
    );
    writeFileSync(
      join(dir, `${base}.scss`),
      `@use 'sass:math';
$hue: ${hue}deg;
$pad: math.div(${p + 4}px, 2);

.node {
  padding-left: $pad;
  border-left: 1px solid hsl($hue, 60%, 50%);
  &--even { background: hsl($hue, 40%, 97%); }
  &__title { font-size: 11px; color: hsl($hue, 70%, 30%); }
  &__tags { display: flex; gap: 2px; margin: 0; padding: 0; list-style: none; }
  &__leaf { color: hsl($hue, 80%, 25%); }
}
`,
    );
    generated++;
  }
}

const perRoot = Math.ceil(chains / ROOTS);
for (let r = 0; r < ROOTS; r++) {
  const from = r * perRoot;
  const to = Math.min(chains, from + perRoot);
  if (from >= to) break;
  const heads = [];
  for (let c = from; c < to; c++) heads.push(c);
  const nodes = heads.reduce((sum, c) => sum + Math.min(CHAIN_LEN, N - c * CHAIN_LEN), 0);
  writeFileSync(
    join(out, `scale-root-${r}.component.ts`),
    `import { Component, signal } from '@angular/core';
${heads.map((c) => `import { ${cls(c, 0)} } from './chain-${c}/cmp-0.component';`).join('\n')}

@Component({
  selector: 'sb-scale-root-${r}',
  imports: [${heads.map((c) => cls(c, 0)).join(', ')}],
  template: \`
    <p data-cy="last-ping">{{ lastPing() }}</p>
${heads.map((c) => `    <${sel(c, 0)} title="root ${r} chain ${c}" (ping)="lastPing.set($event)" />`).join('\n')}
  \`,
})
export class ScaleRoot${r}Component {
  readonly lastPing = signal('none');
}
`,
  );
  writeFileSync(
    join(specsDir, `scale-${r}.cy.ts`),
    `import { ScaleRoot${r}Component } from '@scale/scale-root-${r}.component';

describe('scale fixture root ${r} (${nodes} generated components)', () => {
  it('renders every generated component in the chains', () => {
    cy.mount(ScaleRoot${r}Component);
    cy.get('[data-cy=scale-node]').should('have.length', ${nodes});
    cy.get('[data-cy=scale-leaf]').should('have.length', ${heads.length});
  });

  it('bubbles outputs up a chain', () => {
    cy.mount(ScaleRoot${r}Component);
    cy.get('[data-cy=scale-leaf]').first().parent().find('> .node__ping').click();
    cy.get('[data-cy=last-ping]').should('contain.text', '${sel(heads[0], 0)}<');
  });
});
`,
  );
}
console.log(`generated ${generated} components in ${chains} chains, ${ROOTS} roots/specs`);
