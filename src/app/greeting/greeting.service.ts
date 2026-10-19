import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GreetingService {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}

@Injectable({ providedIn: 'root' })
export class ClockService {
  now(): string {
    return new Date().toISOString();
  }
}
