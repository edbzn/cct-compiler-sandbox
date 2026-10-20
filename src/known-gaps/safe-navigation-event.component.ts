import { Component, signal } from '@angular/core';

export interface Item {
  id: number;
  label: string;
}

// OXC 0.0.41 bug (upstream voidzero-dev/oxc-angular-compiler#585, fix in #587): `$safeNavigationMigration(x?.y)`
// inside an event binding, where `x` is a @for item or an `@if … as` alias, compiles to a read of
// `ctx.x` (the component) instead of the template-local variable, so the handler receives null.
@Component({
  selector: 'sb-safe-navigation-event',
  template: `
    @for (item of items(); track item.id) {
      <button type="button" data-cy="pick" (click)="pick($safeNavigationMigration(item?.id))">{{ item.label }}</button>
    }
    @if (current(); as cur) {
      <button type="button" data-cy="pick-alias" (click)="pick($safeNavigationMigration(cur?.id))">alias {{ cur.label }}</button>
    }
    <p data-cy="picked">{{ picked() }}</p>
  `,
})
export class SafeNavigationEventComponent {
  readonly items = signal<Item[]>([
    { id: 1, label: 'one' },
    { id: 2, label: 'two' },
  ]);
  readonly current = signal<Item | null>({ id: 7, label: 'seven' });
  readonly picked = signal<string>('none');

  pick(id: number | null | undefined): void {
    this.picked.set(String(id));
  }
}
