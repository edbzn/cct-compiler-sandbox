import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LibAvatarComponent } from 'sandbox-ui-lib';

// OXC 0.0.41 bug (upstream voidzero-dev/oxc-angular-compiler#588): when linking a partial-compiled
// npm library for Angular < 22.2.2, `ɵɵsanitizeUrl` is dropped from img/video [src] bindings, so a
// SafeUrl object is stringified ("SafeValue must use [property]=binding: …") and the image never loads.
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

@Component({
  imports: [LibAvatarComponent],
  template: `<lib-avatar [src]="url" alt="safe" />`,
})
class SafeUrlHostComponent {
  readonly url: SafeUrl = inject(DomSanitizer).bypassSecurityTrustUrl(PNG_1PX);
}

describe('known-oxc-bugs: SafeUrl bound to a library img [src] (#588)', () => {
  it('unwraps the SafeUrl and loads the image', () => {
    cy.mount(SafeUrlHostComponent);
    cy.get('[data-cy=lib-avatar]')
      .should('have.attr', 'src', PNG_1PX)
      .and(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.equal(1));
  });
});
