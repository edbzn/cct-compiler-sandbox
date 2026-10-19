import { provideRouter, Router, withComponentInputBinding, withHashLocation } from '@angular/router';
import { RouterShellComponent, routes } from './router-shell.component';

describe('Router (links, input binding, lazy route)', () => {
  beforeEach(() => {
    // TestBed does not bootstrap an application, so trigger the initial navigation explicitly.
    cy.mount(RouterShellComponent, {
      providers: [provideRouter(routes, withComponentInputBinding(), withHashLocation())],
    }).then(({ fixture }) => fixture.debugElement.injector.get(Router).navigateByUrl('/'));
  });

  it('navigates with routerLink and binds route params to inputs', () => {
    cy.get('[data-cy=page]').should('have.text', 'home');
    cy.get('[data-cy=home-link]').should('have.class', 'active');
    cy.get('[data-cy=detail-link]').click();
    cy.get('[data-cy=page]').should('have.text', 'detail 42');
    cy.get('[data-cy=detail-link]').should('have.class', 'active');
  });

  it('loads a lazy component route', () => {
    cy.get('[data-cy=lazy-link]').click();
    cy.get('[data-cy=page]').should('have.text', 'lazy loaded');
  });
});
