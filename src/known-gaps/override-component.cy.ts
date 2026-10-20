import { TestBed } from '@angular/core/testing';
import { GreetingComponent } from '../app/greeting/greeting.component';
import { ClockService } from '../app/greeting/greeting.service';

// Known gap of plain AOT (analog-aot, angular-build): TestBed recompiles an overridden component from its
// decorator metadata, which AOT output does not keep. JIT setups and OXC (AOT with class metadata) pass.
// analog-fast keeps the decorator but not the input metadata, so only the template test fails
// (analogjs/analog#2666).
describe('known-gaps: TestBed.overrideComponent (plain AOT)', () => {
  it('overrideComponent replaces component-level providers', () => {
    TestBed.overrideComponent(GreetingComponent, {
      set: { providers: [{ provide: ClockService, useValue: { now: () => 'frozen-time' } }] },
    });
    cy.mount(GreetingComponent);
    cy.get('[data-cy=time]').should('have.text', 'frozen-time');
  });

  it('overrideComponent replaces the template', () => {
    TestBed.overrideComponent(GreetingComponent, {
      set: { template: '<p data-cy="override">overridden {{ name() }}</p>', templateUrl: undefined },
    });
    cy.mount(GreetingComponent, { componentProperties: { name: 'template' } });
    cy.get('[data-cy=override]').should('have.text', 'overridden template');
  });
});
