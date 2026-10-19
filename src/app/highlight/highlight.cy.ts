import { HighlightDirective } from './highlight.directive';

describe('HighlightDirective (host bindings and listeners)', () => {
  beforeEach(() => {
    cy.mount(`<button sbHighlight="rgb(0, 255, 0)" data-cy="target">hover me</button>`, {
      imports: [HighlightDirective],
    });
  });

  it('applies host class and style on mouseenter/mouseleave', () => {
    cy.get('[data-cy=target]').trigger('mouseenter').should('have.class', 'highlighted').and('have.css', 'background-color', 'rgb(0, 255, 0)');
    cy.get('[data-cy=target]').trigger('mouseleave').should('not.have.class', 'highlighted');
  });

  it('handles @HostListener click and document keydown with @HostBinding', () => {
    cy.get('[data-cy=target]').click().should('have.attr', 'aria-pressed', 'true').and('have.attr', 'data-presses', '1');
    cy.get('[data-cy=target]').click().should('have.attr', 'aria-pressed', 'false').and('have.attr', 'data-presses', '2');
    cy.get('[data-cy=target]').click().should('have.attr', 'aria-pressed', 'true');
    cy.document().trigger('keydown', { key: 'Escape' });
    cy.get('[data-cy=target]').should('have.attr', 'aria-pressed', 'false');
  });
});
