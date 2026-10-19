import { provideHttpClient } from '@angular/common/http';
import { UserListComponent } from './user-list.component';
import { API_BASE_URL } from './user.service';

const users = [
  { id: 2, name: 'Zoe', email: 'zoe@example.test' },
  { id: 1, name: 'Adam', email: 'adam@example.test' },
];

describe('UserListComponent (DI + HttpClient + cy.intercept)', () => {
  it('loads and sorts users from the API', () => {
    cy.intercept('GET', '/api/users?q=', { items: users }).as('list');
    cy.mount(UserListComponent, { providers: [provideHttpClient()] });
    cy.wait('@list');
    cy.get('[data-cy=user-name]').should('have.length', 2).first().should('have.text', 'Adam');
  });

  it('sends the search query and honours an overridden base URL token', () => {
    cy.intercept('GET', '/v2/users?q=', { items: [] }).as('initial');
    cy.intercept('GET', '/v2/users?q=ad', { items: [users[1]] }).as('search');
    cy.mount(UserListComponent, {
      providers: [provideHttpClient(), { provide: API_BASE_URL, useValue: '/v2' }],
    });
    cy.wait('@initial');
    cy.get('[data-cy=search]').type('ad{enter}');
    cy.wait('@search');
    cy.get('[data-cy=user]').should('have.length', 1);
  });

  it('removes a user with DELETE', () => {
    cy.intercept('GET', '/api/users?q=', { items: users });
    cy.intercept('DELETE', '/api/users/1', { statusCode: 204 }).as('delete');
    cy.mount(UserListComponent, { providers: [provideHttpClient()] });
    cy.get('[data-cy=remove]').first().click();
    cy.wait('@delete');
    cy.get('[data-cy=user-name]').should('have.length', 1).and('have.text', 'Zoe');
  });

  it('shows an error state on a 500', () => {
    cy.intercept('GET', '/api/users?q=', { statusCode: 500, body: {} });
    cy.mount(UserListComponent, { providers: [provideHttpClient()] });
    cy.get('[data-cy=error]').should('have.text', 'Could not load users').and('have.css', 'color', 'rgb(200, 0, 0)');
  });
});
