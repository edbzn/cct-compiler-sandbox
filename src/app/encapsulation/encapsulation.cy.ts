import { EncapsulationHostComponent } from './encapsulation.components';

describe('ViewEncapsulation', () => {
  beforeEach(() => cy.mount(EncapsulationHostComponent));

  it('scopes Emulated styles to the component', () => {
    cy.get('[data-cy=emulated]').should('have.css', 'color', 'rgb(0, 0, 255)');
    cy.get('[data-cy=outside]').should('not.have.css', 'color', 'rgb(0, 0, 255)');
  });

  it('leaks None styles globally', () => {
    cy.get('[data-cy=none]').should('have.css', 'color', 'rgb(255, 165, 0)');
    cy.get('[data-cy=leaky]').should('have.css', 'color', 'rgb(255, 165, 0)');
  });

  it('renders ShadowDom styles inside a shadow root', () => {
    cy.get('sb-shadow').shadow().find('[data-cy=shadow]').should('have.css', 'color', 'rgb(128, 0, 128)');
    cy.get('sb-shadow').then(($el) => expect($el[0].shadowRoot).to.not.equal(null));
  });
});
