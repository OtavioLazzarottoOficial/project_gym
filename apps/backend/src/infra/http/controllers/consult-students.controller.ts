import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { ConsultStudentsUseCase } from '../../../domain/students/application/usecases/consult-students-usecase.ts';
import { NotAllowedError } from '../../../domain/accounts/application/errors/not-allowed-error.ts';
import { OrganizationNotFoundError } from '../../../domain/organizations/application/errors/organization-not-found-error.ts';
import { StudentNotFoundError } from '../../../domain/students/application/errors/student-not-found-error.ts';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';
import { ZodValidationPipe } from '../pipes/zod-validation-pipe.ts';
import { StudentPresenter } from '../presenters/student-presenter.ts';
import type { StudentRecord } from '../../../domain/students/application/repositories/students-repository.ts';
import { STUDENTS_PAGE_SIZE } from '../../../domain/students/application/repositories/students-repository.ts';

const pageSchema = z
  .object({
    page: z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .transform(Number)
      .optional()
      .default(1),
  })
  .strict();

@Controller('/organizations/:organizationId/students')
export class ConsultStudentsController {
  constructor(private readonly consult: ConsultStudentsUseCase) {}

  private present(record: StudentRecord) {
    return {
      ...StudentPresenter.toHTTP(record.student),
      name: record.name,
      email: record.email,
    };
  }

  private async query(
    current: UserPayload,
    organizationId: string,
    studentId?: string,
    page?: number,
  ) {
    const result = await this.consult.execute({
      requestedBy: current.sub,
      organizationId,
      studentId,
      page,
    });
    if (result.isLeft()) {
      if (result.value instanceof NotAllowedError)
        throw new ForbiddenException();
      if (
        result.value instanceof OrganizationNotFoundError ||
        result.value instanceof StudentNotFoundError
      )
        throw new NotFoundException();
      throw result.value;
    }
    return {
      students: result.value.students.map((record) => this.present(record)),
      hasNextPage: result.value.hasNextPage,
    };
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @CurrentUser() current: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
    @Query(new ZodValidationPipe(pageSchema)) query: z.infer<typeof pageSchema>,
  ) {
    const result = await this.query(
      current,
      organizationId,
      undefined,
      query.page,
    );
    return {
      students: result.students,
      pagination: {
        page: query.page,
        page_size: STUDENTS_PAGE_SIZE,
        has_next_page: result.hasNextPage,
      },
    };
  }

  @Get(':studentId')
  @Header('Cache-Control', 'no-store')
  async get(
    @CurrentUser() current: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
    @Param('studentId', new ZodValidationPipe(z.uuid())) studentId: string,
  ) {
    const result = await this.query(current, organizationId, studentId);
    return { student: result.students[0] };
  }
}
