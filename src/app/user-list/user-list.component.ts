import { Component, inject, OnInit, signal } from '@angular/core';
import { User, UserService } from './user.service';

@Component({
  selector: 'sb-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private readonly users = inject(UserService);
  protected readonly items = signal<User[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.load('');
  }

  load(search: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.users.list(search).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load users');
        this.loading.set(false);
      },
    });
  }

  remove(user: User): void {
    this.users.remove(user.id).subscribe(() => this.items.update((list) => list.filter((u) => u.id !== user.id)));
  }
}
