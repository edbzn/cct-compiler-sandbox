import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, max = 10, suffix = '…'): string {
    if (!value) {
      return '';
    }
    return value.length > max ? value.slice(0, max).trimEnd() + suffix : value;
  }
}
