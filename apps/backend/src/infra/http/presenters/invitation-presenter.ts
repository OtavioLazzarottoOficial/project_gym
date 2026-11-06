import { Injectable } from '@nestjs/common';
import type { InvitationResult } from '../../../domain/accounts/application/usecases/issue-invitation-usecase.ts';
import { EnvService } from '../../env/env.service.ts';

@Injectable()
export class InvitationPresenter {
  constructor(private readonly env: EnvService) {}

  toHTTP(invitation: InvitationResult) {
    if (invitation.status !== 'manual') return { status: invitation.status };
    const link = new URL('/define-password', this.env.get('FRONTEND_URL'));
    link.hash = new URLSearchParams({ token: invitation.token }).toString();
    return { status: 'manual' as const, link: link.toString() };
  }
}
