import { Component, inject, signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { ConfirmDialogComponent, ConfirmData } from './confirm-dialog.component';

@Component({
  selector: 'sb-dialog-launcher',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay],
  template: `
    <button type="button" data-cy="open" (click)="open()">Delete</button>
    <p data-cy="result">{{ result() }}</p>
    <button type="button" data-cy="menu-trigger" cdkOverlayOrigin #origin="cdkOverlayOrigin" (click)="menuOpen.set(!menuOpen())">Menu</button>
    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="menuOpen()" (overlayOutsideClick)="menuOpen.set(false)">
      <ul class="menu" data-cy="menu"><li>Rename</li><li>Archive</li></ul>
    </ng-template>
  `,
})
export class DialogLauncherComponent {
  private readonly dialog = inject(Dialog);
  protected readonly result = signal('none');
  protected readonly menuOpen = signal(false);

  open(): void {
    const ref = this.dialog.open<boolean, ConfirmData>(ConfirmDialogComponent, {
      data: { title: 'Delete item?', message: 'This cannot be undone.' },
    });
    ref.closed.subscribe((confirmed) => this.result.set(confirmed ? 'confirmed' : 'cancelled'));
  }
}
