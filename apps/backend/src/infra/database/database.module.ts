import { Module } from '@nestjs/common';
import { EnvModule } from '../env/env.module.ts';
import { PrismaService } from './prisma/prisma.service.ts';
import { StudentsRepository } from '../../domain/students/application/repositories/students-repository.ts';
import { StudentRegistrationClock } from '../../domain/students/application/services/student-registration-clock.ts';
import { BrasiliaStudentRegistrationClock } from '../clock/brasilia-student-registration-clock.ts';
import { PrismaStudentsRepository } from './prisma/repositories/prisma-students-repository.ts';
import { PrismaStudentWriteErrorHandler } from '../errors/prisma/prisma-student-write-error-handler.ts';
import { PasswordChangesRepository } from '../../domain/accounts/application/repositories/password-changes-repository.ts';
import { PrismaPasswordChangesRepository } from './prisma/repositories/prisma-password-changes-repository.ts';
import { InvitationsRepository } from '../../domain/accounts/application/repositories/invitations-repository.ts';
import { PrismaInvitationsRepository } from './prisma/repositories/prisma-invitations-repository.ts';

import { UsersRepository } from '../../domain/accounts/application/repositories/users-repository.ts';
import { PrismaUsersRepository } from './prisma/repositories/prisma-users-repository.ts';
import { PrismaUserWriteErrorHandler } from '../errors/prisma/prisma-user-write-error-handler.ts';

import { AuthSessionsRepository } from '../../domain/auth/application/repositories/auth-sessions-repository.ts';
import { PrismaAuthSessionsRepository } from './prisma/repositories/prisma-auth-sessions-repository.ts';

import { OrganizationsRepository } from '../../domain/organizations/application/repositories/organizations-repository.ts';
import { PrismaOrganizationsRepository } from './prisma/repositories/prisma-organizations-repository.ts';
import { BranchesRepository } from '../../domain/organizations/application/repositories/branches-repository.ts';
import { PrismaBranchesRepository } from './prisma/repositories/prisma-branches-repository.ts';
import { MembershipsRepository } from '../../domain/organizations/application/repositories/memberships-repository.ts';
import { PrismaMembershipsRepository } from './prisma/repositories/prisma-memberships-repository.ts';
import { PrismaMembershipWriteErrorHandler } from '../errors/prisma/prisma-membership-write-error-handler.ts';

@Module({
  imports: [EnvModule],
  providers: [
    PrismaService,
    {
      provide: StudentRegistrationClock,
      useClass: BrasiliaStudentRegistrationClock,
    },
    PrismaStudentWriteErrorHandler,
    { provide: StudentsRepository, useClass: PrismaStudentsRepository },
    {
      provide: PasswordChangesRepository,
      useClass: PrismaPasswordChangesRepository,
    },
    { provide: InvitationsRepository, useClass: PrismaInvitationsRepository },
    PrismaMembershipWriteErrorHandler,
    {
      provide: OrganizationsRepository,
      useClass: PrismaOrganizationsRepository,
    },
    { provide: BranchesRepository, useClass: PrismaBranchesRepository },
    { provide: MembershipsRepository, useClass: PrismaMembershipsRepository },
    PrismaUserWriteErrorHandler,
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    { provide: AuthSessionsRepository, useClass: PrismaAuthSessionsRepository },
  ],
  exports: [
    PrismaService,
    StudentRegistrationClock,
    StudentsRepository,
    PasswordChangesRepository,
    InvitationsRepository,
    UsersRepository,
    AuthSessionsRepository,
    OrganizationsRepository,
    BranchesRepository,
    MembershipsRepository,
  ],
})
export class DatabaseModule {}
