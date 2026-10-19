import { PipeShowcaseComponent } from './pipe-showcase.component';
import { TruncatePipe } from './truncate.pipe';

describe('Pipes', () => {
  it('applies a custom pure pipe and chains built-in pipes', () => {
    cy.mount(PipeShowcaseComponent, {
      componentProperties: { text: 'Component testing with Cypress', price: 1234.5, date: new Date(Date.UTC(2026, 9, 19)) },
    });
    cy.get('[data-cy=truncated]').should('have.text', 'Component te…');
    cy.get('[data-cy=custom-suffix]').should('have.text', 'COMPO...');
    cy.get('[data-cy=price]').should('have.text', '€1,234.50');
    cy.get('[data-cy=date]').should('have.text', '2026-10-19');
  });

  it('transforms directly as a class', () => {
    const pipe = new TruncatePipe();
    expect(pipe.transform('short')).to.equal('short');
    expect(pipe.transform(null)).to.equal('');
    expect(pipe.transform('0123456789abc', 4)).to.equal('0123…');
  });
});
