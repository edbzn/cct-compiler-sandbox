import { Component, inject, input } from '@angular/core';
import { ClockService, GreetingService } from './greeting.service';

@Component({
  selector: 'sb-greeting',
  templateUrl: './greeting.component.html',
  styleUrl: './greeting.component.scss',
  providers: [ClockService],
})
export class GreetingComponent {
  readonly name = input('world');
  protected readonly greeter = inject(GreetingService);
  protected readonly clock = inject(ClockService);
}
