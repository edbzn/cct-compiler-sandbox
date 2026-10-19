import { DialogLauncherComponent } from './dialog-launcher.component';

describe('CDK Dialog + connected overlay', () => {
  it('opens a CDK dialog in the overlay container and returns the result', () => {
    cy.mount(DialogLauncherComponent);
    cy.get('[data-cy=open]').click();
    cy.get('.cdk-overlay-container [data-cy=dialog-title]').should('have.text', 'Delete item?');
    cy.get('[data-cy=confirm]').click();
    cy.get('[data-cy=dialog]').should('not.exist');
    cy.get('[data-cy=result]').should('have.text', 'confirmed');
  });

  it('cancels the dialog', () => {
    cy.mount(DialogLauncherComponent);
    cy.get('[data-cy=open]').click();
    cy.get('[data-cy=cancel]').click();
    cy.get('[data-cy=result]').should('have.text', 'cancelled');
  });

  it('toggles a connected overlay menu', () => {
    cy.mount(DialogLauncherComponent);
    cy.get('[data-cy=menu]').should('not.exist');
    cy.get('[data-cy=menu-trigger]').click();
    cy.get('.cdk-overlay-pane [data-cy=menu]').should('contain.text', 'Archive');
    cy.get('[data-cy=menu-trigger]').click();
    cy.get('[data-cy=menu]').should('not.exist');
  });
});
