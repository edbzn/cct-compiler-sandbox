import { Directive, HostBinding, HostListener, input, signal } from '@angular/core';

@Directive({
  selector: '[sbHighlight]',
  host: {
    '[class.highlighted]': 'active()',
    '[style.background-color]': 'active() ? color() : null',
    '[attr.aria-pressed]': 'pressed()',
    '(mouseenter)': 'active.set(true)',
    '(mouseleave)': 'active.set(false)',
  },
})
export class HighlightDirective {
  readonly color = input('rgb(255, 255, 0)', { alias: 'sbHighlight' });
  protected readonly active = signal(false);
  protected readonly pressed = signal(false);

  @HostBinding('attr.data-presses') presses = 0;

  @HostListener('click')
  onClick(): void {
    this.presses++;
    this.pressed.update((p) => !p);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.pressed.set(false);
  }
}
