// JIT fallback: lets TestBed (re)compile components (overrideComponent) and link partial
// declarations that were not linked at build time.
import '@angular/compiler';
import 'zone.js';
import { mount } from '@cypress/angular';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

// Bench marker: runs once per spec, after the spec bundle has been compiled, served and evaluated,
// right before its first test. The node side timestamps it (no-op without BENCH_EVENTS).
before(() => {
  cy.task('bench:mark', { event: 'spec:firstTest', spec: Cypress.spec.relative }, { log: false });
});
