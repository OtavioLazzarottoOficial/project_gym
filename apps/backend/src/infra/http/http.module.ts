import { EnvModule } from '../env/env.module.ts';
import { ConsultStudentsController } from './controllers/consult-students.controller.ts';
import { ConsultStudentsUseCase } from '../../domain/students/application/usecases/consult-students-usecase.ts';
import { RegisterStudentController } from './controllers/register-student.controller.ts';
import { RegisterStudentUseCase } from '../../domain/students/application/usecases/register-student-usecase.ts';
import { ChangePasswordController } from './controllers/change-password.controller.ts';
import { ChangePasswordUseCase } from '../../domain/accounts/application/usecases/change-password-usecase.ts';
import { ReissueInvitationByEmailUseCase } from '../../domain/accounts/application/usecases/reissue-invitation-by-email-usecase.ts';
import { InvitationsController } from './controllers/invitations.controller.ts';
import { InvitationPresenter } from './presenters/invitation-presenter.ts';
import { IssueInvitationUseCase } from '../../domain/accounts/application/usecases/issue-invitation-usecase.ts';
import { AcceptInvitationUseCase } from '../../domain/accounts/application/usecases/accept-invitation-usecase.ts';
import { ConnectionController } from './connection.controller.ts';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.ts';
import { AppController } from './app.controller.ts';
import { CryptographyModule } from '../cryptography/cryptography.module.ts';
import { MailModule } from '../mail/mail.module.ts';

import { CreateUserController } from './controllers/create-user.controller.ts';
import { CreateUserUseCase } from '../../domain/accounts/application/usecases/create-user-usecase.ts';

import { AuthenticateController } from './controllers/authenticate.controller.ts';
import { SignOutController } from './controllers/sign-out.controller.ts';
import { MeController } from './controllers/me.controller.ts';
import { AuthenticateUserUseCase } from '../../domain/auth/application/usecases/authenticate-user-usecase.ts';
import { SignOutUseCase } from '../../domain/auth/application/usecases/sign-out-usecase.ts';

import { OrganizationsController } from './controllers/organizations.controller.ts';
import { OrganizationAccess } from '../../domain/organizations/application/services/organization-access.ts';
import { CreateOrganizationUseCase } from '../../domain/organizations/application/usecases/create-organization-usecase.ts';
import { ListOrganizationsUseCase } from '../../domain/organizations/application/usecases/list-organizations-usecase.ts';
import { CreateBranchUseCase } from '../../domain/organizations/application/usecases/create-branch-usecase.ts';
import { ListBranchesUseCase } from '../../domain/organizations/application/usecases/list-branches-usecase.ts';

@Module({
  imports: [DatabaseModule, CryptographyModule, MailModule, EnvModule],
  controllers: [
    ConnectionController,
    AppController,
    CreateUserController,
    RegisterStudentController,
    ConsultStudentsController,
    ChangePasswordController,
    InvitationsController,
    AuthenticateController,
    SignOutController,
    MeController,
    OrganizationsController,
  ],
  providers: [
    CreateUserUseCase,
    RegisterStudentUseCase,
    ConsultStudentsUseCase,
    ChangePasswordUseCase,
    IssueInvitationUseCase,
    ReissueInvitationByEmailUseCase,
    AcceptInvitationUseCase,
    InvitationPresenter,
    AuthenticateUserUseCase,
    SignOutUseCase,
    OrganizationAccess,
    CreateOrganizationUseCase,
    ListOrganizationsUseCase,
    CreateBranchUseCase,
    ListBranchesUseCase,
  ],
})
export class HttpModule {}
