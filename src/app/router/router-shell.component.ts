import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';

@Component({
  selector: 'sb-home-page',
  template: `<p data-cy="page">home</p>`,
})
export class HomePageComponent {}

@Component({
  selector: 'sb-detail-page',
  template: `<p data-cy="page">detail {{ id() }}</p>`,
})
export class DetailPageComponent {
  readonly id = input.required<string>();
}

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'items/:id', component: DetailPageComponent },
  { path: 'lazy', loadComponent: () => import('./lazy-page.component').then((m) => m.LazyPageComponent) },
];

@Component({
  selector: 'sb-router-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" data-cy="home-link">home</a>
      <a routerLink="/items/42" routerLinkActive="active" data-cy="detail-link">item 42</a>
      <a routerLink="/lazy" data-cy="lazy-link">lazy</a>
    </nav>
    <router-outlet />
  `,
})
export class RouterShellComponent {}
