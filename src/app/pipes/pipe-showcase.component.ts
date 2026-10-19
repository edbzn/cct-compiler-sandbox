import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { TruncatePipe } from './truncate.pipe';

@Component({
  selector: 'sb-pipe-showcase',
  imports: [TruncatePipe, UpperCasePipe, CurrencyPipe, DatePipe],
  template: `
    <p data-cy="truncated">{{ text() | truncate: 12 }}</p>
    <p data-cy="custom-suffix">{{ text() | truncate: 5 : '...' | uppercase }}</p>
    <p data-cy="price">{{ price() | currency: 'EUR' : 'symbol' : '1.2-2' : 'en-US' }}</p>
    <p data-cy="date">{{ date() | date: 'yyyy-MM-dd' : 'UTC' }}</p>
  `,
})
export class PipeShowcaseComponent {
  readonly text = input('');
  readonly price = input(0);
  readonly date = input<Date>(new Date(0));
}
