import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'sb-emulated',
  template: `<p class="probe" data-cy="emulated">emulated</p>`,
  styles: `.probe { color: rgb(0, 0, 255); }`,
  encapsulation: ViewEncapsulation.Emulated,
})
export class EmulatedComponent {}

@Component({
  selector: 'sb-unencapsulated',
  template: `<p class="probe-none" data-cy="none">none</p>`,
  styles: `.probe-none { color: rgb(255, 165, 0); } .leaky { color: rgb(255, 165, 0); }`,
  encapsulation: ViewEncapsulation.None,
})
export class UnencapsulatedComponent {}

@Component({
  selector: 'sb-shadow',
  template: `<p class="probe" data-cy="shadow">shadow</p>`,
  styles: `.probe { color: rgb(128, 0, 128); }`,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class ShadowComponent {}

@Component({
  selector: 'sb-encapsulation-host',
  imports: [EmulatedComponent, UnencapsulatedComponent, ShadowComponent],
  template: `
    <sb-emulated />
    <sb-unencapsulated />
    <sb-shadow />
    <p class="probe" data-cy="outside">outside emulated scope</p>
    <p class="leaky" data-cy="leaky">styled by None</p>
  `,
})
export class EncapsulationHostComponent {}
