import { SignupFormComponent } from './signup-form.component';

describe('SignupFormComponent (reactive forms)', () => {
  it('shows validation errors and does not submit an invalid form', () => {
    const onSubmit = cy.spy().as('submitted');
    cy.mount(SignupFormComponent).then(({ component }) => component.submitted.subscribe(onSubmit));
    cy.get('[data-cy=email]').type('not-an-email');
    cy.get('[data-cy=password]').type('short');
    cy.get('[data-cy=confirm]').type('other');
    cy.get('[data-cy=submit]').click();
    cy.get('[data-cy=email-error]').should('be.visible');
    cy.get('[data-cy=password-error]').should('be.visible');
    cy.get('[data-cy=mismatch]').should('be.visible');
    cy.get('@submitted').should('not.have.been.called');
  });

  it('submits a valid form with the selected plan', () => {
    const onSubmit = cy.spy().as('submitted');
    cy.mount(SignupFormComponent).then(({ component }) => component.submitted.subscribe(onSubmit));
    cy.get('[data-cy=email]').type('a@b.test');
    cy.get('[data-cy=password]').type('long-enough');
    cy.get('[data-cy=confirm]').type('long-enough');
    cy.get('[data-cy=plan]').select('pro');
    cy.get('[data-cy=submit]').click();
    cy.get('@submitted').should('have.been.calledOnceWith', { email: 'a@b.test', password: 'long-enough', plan: 'pro' });
  });
});
