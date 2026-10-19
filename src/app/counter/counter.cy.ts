import { Component, signal } from '@angular/core';
import { CounterComponent } from './counter.component';

@Component({
  imports: [CounterComponent],
  template: `<sb-counter label="Host" [(value)]="hostValue" [step]="2" [max]="6" (limitReached)="limit.set($event)" />
    <p data-cy="host-value">{{ hostValue() }}</p>
    <p data-cy="limit">{{ limit() }}</p>`,
})
class CounterHostComponent {
  readonly hostValue = signal(0);
  readonly limit = signal<number | null>(null);
}

describe('CounterComponent (signals, input/output/model)', () => {
  it('renders required input and increments by step', () => {
    cy.mount(CounterComponent, { componentProperties: { label: 'Clicks', step: 3 } });
    cy.get('[data-cy=label]').should('have.text', 'Clicks');
    cy.get('[data-cy=increment]').click().click();
    cy.get('[data-cy=value]').should('have.text', '6');
    cy.get('[data-cy=doubled]').should('have.text', 'doubled: 12');
    cy.get('[data-cy=clicks]').should('have.text', 'clicks: 2');
  });

  it('applies SCSS from styleUrl', () => {
    cy.mount(CounterComponent, { componentProperties: { label: 'Styled' } });
    cy.get('[data-cy=value]').should('have.css', 'color', 'rgb(0, 128, 0)');
  });

  it('two-way binds model() and emits output at the limit', () => {
    cy.mount(CounterHostComponent);
    cy.get('[data-cy=increment]').click().click().click();
    cy.get('[data-cy=host-value]').should('have.text', '6');
    cy.get('[data-cy=limit]').should('have.text', '6');
    cy.get('[data-cy=increment]').should('be.disabled');
    cy.get('[data-cy=value]').should('have.css', 'color', 'rgb(200, 0, 0)');
    cy.get('[data-cy=reset]').click();
    cy.get('[data-cy=host-value]').should('have.text', '0');
  });

  it('emits output() to a subscriber', () => {
    const onLimit = cy.spy().as('limit');
    cy.mount(CounterComponent, {
      componentProperties: { label: 'Spy', max: 1 },
    }).then(({ component }) => {
      component.limitReached.subscribe(onLimit);
    });
    cy.get('[data-cy=increment]').click();
    cy.get('@limit').should('have.been.calledOnceWith', 1);
  });
});
