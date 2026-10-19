import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface ConfirmData {
  title: string;
  message: string;
}

@Component({
  selector: 'sb-confirm-dialog',
  template: `
    <div class="dialog" data-cy="dialog" role="dialog">
      <h2 data-cy="dialog-title">{{ data.title }}</h2>
      <p>{{ data.message }}</p>
      <button type="button" data-cy="confirm" (click)="ref.close(true)">OK</button>
      <button type="button" data-cy="cancel" (click)="ref.close(false)">Cancel</button>
    </div>
  `,
  styles: `.dialog { background: rgb(255, 255, 255); padding: 8px; border: 1px solid rgb(0, 0, 0); }`,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}
