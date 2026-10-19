import { Component, contentChildren, Directive, input } from '@angular/core';

@Directive({ selector: '[sbCardAction]' })
export class CardActionDirective {
  readonly sbCardAction = input('');
}

@Component({
  selector: 'sb-card',
  template: `
    <article class="card">
      <header data-cy="card-header"><ng-content select="[card-title]" /></header>
      <div data-cy="card-body"><ng-content /></div>
      <footer data-cy="card-footer">
        <ng-content select="sb-card-footer, [card-footer]">default footer</ng-content>
      </footer>
      <p data-cy="action-count">{{ actions().length }} actions</p>
    </article>
  `,
  styles: `
    :host { display: block; }
    .card header { font-weight: 700; }
  `,
})
export class CardComponent {
  readonly actions = contentChildren(CardActionDirective, { descendants: true });
}
