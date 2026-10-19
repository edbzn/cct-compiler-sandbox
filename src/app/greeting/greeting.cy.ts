import { TestBed } from '@angular/core/testing';
import { GreetingComponent } from './greeting.component';
import { ClockService, GreetingService } from './greeting.service';

describe('GreetingComponent (TestBed overrides)', () => {
  it('renders with real services', () => {
    cy.mount(GreetingComponent, { componentProperties: { name: 'Cypress' } });
    cy.get('[data-cy=greeting]').should('have.text', 'Hello, Cypress!');
  });

  it('overrideProvider replaces a root service', () => {
    TestBed.overrideProvider(GreetingService, { useValue: { greet: (n: string) => `Bonjour, ${n}!` } });
    cy.mount(GreetingComponent, { componentProperties: { name: 'Ada' } });
    cy.get('[data-cy=greeting]').should('have.text', 'Bonjour, Ada!');
  });

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
