import { Injectable } from '@nestjs/common';
import { NotAllowedError } from '../../../../domain/accounts/application/errors/not-allowed-error.ts';
import type { User } from '../../../../domain/accounts/enterprise/user.ts';
import { UserRole } from '../../../../domain/accounts/enterprise/enums/user-role.ts';
import { StudentsRepository } from '../../../../domain/students/application/repositories/students-repository.ts';
import { StudentRegistrationClock } from '../../../../domain/students/application/services/student-registration-clock.ts';
import type { Student } from '../../../../domain/students/enterprise/student.ts';
import { StudentAlreadyExistsError } from '../../../../domain/students/application/errors/student-already-exists-error.ts';
import { StudentIdentityConflictError } from '../../../../domain/students/application/errors/student-identity-conflict-error.ts';
import { PrismaStudentWriteErrorHandler } from '../../../errors/prisma/prisma-student-write-error-handler.ts';
import { PrismaUserMapper } from '../mappers/prisma-user-mapper.ts';
import { PrismaStudentMapper } from '../mappers/prisma-student-mapper.ts';
import { PrismaService } from '../prisma.service.ts';

@Injectable()
export class PrismaStudentsRepository extends StudentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handler: PrismaStudentWriteErrorHandler,
    private readonly clock: StudentRegistrationClock,
  ) {
    super();
  }

  async register(
    candidate: User,
    student: Student,
    requestedBy: string,
  ): ReturnType<StudentsRepository['register']> {
    return this.handler.execute(() =>
      this.prisma.$transaction(async (tx) => {
        const orgId = student.organizationId.toString();
        const authorization = await tx.membership.updateMany({
          where: {
            user_id: requestedBy,
            organization_id: orgId,
            role: UserRole.ADMIN,
          },
          data: { role: UserRole.ADMIN },
        });
        if (authorization.count !== 1) {
          throw new NotAllowedError();
        }

        // Lock identity keys in deterministic order for concurrent registrations.
        const keys = [
          `email:${candidate.email.value}`,
          `cpf:${student.cpf.value}`,
        ].sort();
        for (const key of keys) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 8903187))`;
        }

        const old = await tx.user.findUnique({
          where: { email: candidate.email.value },
        });
        const cpfOwner = await tx.user.findUnique({
          where: { cpf: student.cpf.value },
        });
        if (
          (old?.cpf && old.cpf !== student.cpf.value) ||
          (cpfOwner && cpfOwner.email !== candidate.email.value)
        ) {
          throw new StudentIdentityConflictError();
        }

        const identity = await tx.user.upsert({
          where: { email: candidate.email.value },
          create: PrismaUserMapper.toPrisma(candidate),
          update: {},
        });
        if (identity.cpf && identity.cpf !== student.cpf.value) {
          throw new StudentIdentityConflictError();
        }

        const existing = await tx.membership.findUnique({
          where: {
            organization_id_user_id: {
              organization_id: orgId,
              user_id: identity.id,
            },
          },
        });
        if (
          existing &&
          (await tx.student.findUnique({
            where: { membership_id: existing.id },
          }))
        ) {
          throw new StudentAlreadyExistsError();
        }

        const user = await tx.user.update({
          where: { id: identity.id },
          data: { cpf: student.cpf.value },
        });
        const membership = await tx.membership.upsert({
          where: {
            organization_id_user_id: {
              organization_id: orgId,
              user_id: identity.id,
            },
          },
          create: {
            organization_id: orgId,
            user_id: identity.id,
            role: UserRole.STUDENT,
          },
          update: { role: UserRole.STUDENT },
        });
        const raw = await tx.student.create({
          data: PrismaStudentMapper.toPrisma(student, membership.id),
        });

        return {
          user: PrismaUserMapper.toDomain(user),
          student: PrismaStudentMapper.toDomain(raw, user, this.clock.today()),
          accountCreated:
            old === null && identity.id === candidate.id.toString(),
        };
      }),
    );
  }
}
