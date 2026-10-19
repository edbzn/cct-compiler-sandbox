import { Component, computed, input, signal } from '@angular/core';
import { DeferredPanelComponent } from './deferred-panel.component';

export type Status = 'idle' | 'loading' | 'done' | 'error';

export interface Task {
  id: number;
  title: string;
  done: boolean;
}

@Component({
  selector: 'sb-control-flow',
  imports: [DeferredPanelComponent],
  templateUrl: './control-flow.component.html',
  styleUrl: './control-flow.component.scss',
})
export class ControlFlowComponent {
  readonly tasks = input<Task[]>([]);
  readonly status = input<Status>('idle');
  protected readonly showDone = signal(true);
  protected readonly loadPanel = signal(false);
  protected readonly visible = computed(() =>
    this.showDone() ? this.tasks() : this.tasks().filter((t) => !t.done),
  );
}
