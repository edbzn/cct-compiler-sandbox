import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';

@Component({
  selector: 'sb-counter',
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  readonly label = input.required<string>();
  readonly step = input(1);
  readonly value = model(0);
  readonly limitReached = output<number>();
  readonly max = input<number | undefined>(undefined);

  protected readonly clicks = signal(0);
  protected readonly doubled = computed(() => this.value() * 2);
  protected readonly atMax = computed(() => {
    const max = this.max();
    return max !== undefined && this.value() >= max;
  });

  increment(): void {
    if (this.atMax()) {
      return;
    }
    this.clicks.update((c) => c + 1);
    this.value.update((v) => v + this.step());
    if (this.atMax()) {
      this.limitReached.emit(this.value());
    }
  }

  reset(): void {
    this.value.set(0);
  }
}
