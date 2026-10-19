import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'lib-badge',
  template: `<span class="badge" [class.badge--strong]="strong()" data-cy="lib-badge">{{ upper() }}</span>`,
  styles: `.badge { color: rgb(10, 20, 30); } .badge--strong { font-weight: 700; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibBadgeComponent {
  readonly text = input('');
  readonly strong = input(false);
  protected readonly upper = computed(() => this.text().toUpperCase());
}
