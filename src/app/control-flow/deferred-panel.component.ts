import { Component } from '@angular/core';

@Component({
  selector: 'sb-deferred-panel',
  template: `<div data-cy="deferred-content">deferred chunk loaded</div>`,
  styles: `div { font-weight: 700; }`,
})
export class DeferredPanelComponent {}
