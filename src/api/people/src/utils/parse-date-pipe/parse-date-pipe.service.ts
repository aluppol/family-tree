import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: string) {
    return new Date(value);
  }
}
