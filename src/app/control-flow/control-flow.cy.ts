import { ControlFlowComponent, Task } from './control-flow.component';

const tasks: Task[] = [
  { id: 1, title: 'Write specs', done: true },
  { id: 2, title: 'Run bench', done: false },
  { id: 3, title: 'Report', done: false },
];

describe('ControlFlowComponent (@if/@for/@switch/@defer)', () => {
  it('renders @for items with $index/$last and @if branches', () => {
    cy.mount(ControlFlowComponent, { componentProperties: { tasks } });
    cy.get('[data-cy=task]').should('have.length', 3).first().should('have.class', 'done');
    cy.get('[data-cy=task]').last().find('[data-cy=last]').should('exist');
    cy.get('[data-cy=toggle-done]').click();
    cy.get('[data-cy=task]').should('have.length', 2).first().should('contain.text', '1. Run bench');
  });

  it('shows the @else branch when empty', () => {
    cy.mount(ControlFlowComponent, { componentProperties: { tasks: [] } });
    cy.get('[data-cy=empty]').should('have.text', 'No tasks');
  });

  (['idle', 'loading', 'done', 'error'] as const).forEach((status) => {
    it(`renders @switch case for ${status}`, () => {
      cy.mount(ControlFlowComponent, { componentProperties: { status } });
      const expected = { idle: 'Idle', loading: 'Loading…', done: 'All done', error: 'Something failed' }[status];
      cy.get('[data-cy=status]').should('have.text', expected);
    });
  });

  it('loads a @defer block on demand', () => {
    cy.mount(ControlFlowComponent);
    cy.get('[data-cy=placeholder]').should('exist');
    cy.get('[data-cy=deferred-content]').should('not.exist');
    cy.get('[data-cy=load-panel]').click();
    cy.get('[data-cy=deferred-content]').should('have.text', 'deferred chunk loaded');
    cy.get('[data-cy=placeholder]').should('not.exist');
  });
});
