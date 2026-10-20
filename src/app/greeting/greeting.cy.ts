import { TestBed } from '@angular/core/testing';
import { GreetingComponent } from './greeting.component';
import { GreetingService } from './greeting.service';

// TestBed.overrideComponent fails under plain AOT, so it lives in src/known-gaps/override-component.cy.ts.
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
});
