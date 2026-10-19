import { SafeNavigationEventComponent } from './safe-navigation-event.component';

describe('known-oxc-bugs: $safeNavigationMigration in event bindings (#587)', () => {
  it('passes the @for item value to the handler', () => {
    cy.mount(SafeNavigationEventComponent);
    cy.get('[data-cy=pick]').eq(1).click();
    cy.get('[data-cy=picked]').should('have.text', '2');
  });

  it('passes the @if-as alias value to the handler', () => {
    cy.mount(SafeNavigationEventComponent);
    cy.get('[data-cy=pick-alias]').click();
    cy.get('[data-cy=picked]').should('have.text', '7');
  });
});
