import { LibAvatarComponent, LibBadgeComponent } from 'sandbox-ui-lib';

// A partial-compiled (ɵɵngDeclare*) npm library: each setup must link it.
describe('Linked npm library (partial compilation)', () => {
  it('renders a library component with signal inputs and styles', () => {
    cy.mount(`<lib-badge text="new" [strong]="true" />`, { imports: [LibBadgeComponent] });
    cy.get('[data-cy=lib-badge]').should('have.text', 'NEW').and('have.css', 'font-weight', '700').and('have.css', 'color', 'rgb(10, 20, 30)');
  });

  it('binds a plain string URL to a library img [src]', () => {
    cy.mount(`<lib-avatar src="/__cypress/src/favicon-probe.png" alt="plain" />`, { imports: [LibAvatarComponent] });
    cy.get('[data-cy=lib-avatar]').should('have.attr', 'src', '/__cypress/src/favicon-probe.png').and('have.attr', 'alt', 'plain');
  });
});
