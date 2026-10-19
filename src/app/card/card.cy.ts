import { CardActionDirective, CardComponent } from './card.component';

describe('CardComponent (content projection)', () => {
  it('projects named and default slots and queries content children', () => {
    cy.mount(
      `<sb-card>
         <h3 card-title data-cy="title">Projected title</h3>
         <p data-cy="body-text">Body text</p>
         <button sbCardAction="edit">Edit</button>
         <div><button sbCardAction="delete">Delete</button></div>
         <span card-footer data-cy="footer-text">custom footer</span>
       </sb-card>`,
      { imports: [CardComponent, CardActionDirective] },
    );
    cy.get('[data-cy=card-header] [data-cy=title]').should('have.text', 'Projected title');
    cy.get('[data-cy=card-body] [data-cy=body-text]').should('exist');
    cy.get('[data-cy=card-footer] [data-cy=footer-text]').should('have.text', 'custom footer');
    cy.get('[data-cy=action-count]').should('have.text', '2 actions');
  });

  it('renders ng-content fallback when the slot is empty', () => {
    cy.mount(`<sb-card><p>only body</p></sb-card>`, { imports: [CardComponent] });
    cy.get('[data-cy=card-footer]').invoke('text').should((text) => expect(text.trim()).to.equal('default footer'));
  });
});
