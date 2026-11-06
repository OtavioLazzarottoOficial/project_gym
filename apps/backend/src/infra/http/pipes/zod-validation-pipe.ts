import { BadRequestException, PipeTransform } from '@nestjs/common';
import z, { ZodError, ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          statusCode: 400,
          errors: z.treeifyError(error),
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
