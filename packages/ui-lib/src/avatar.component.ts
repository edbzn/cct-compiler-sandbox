import { Component, input } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'lib-avatar',
  template: `<img data-cy="lib-avatar" [src]="src()" [alt]="alt()" width="16" height="16" />`,
})
export class LibAvatarComponent {
  readonly src = input<string | SafeUrl>('');
  readonly alt = input('avatar');
}
