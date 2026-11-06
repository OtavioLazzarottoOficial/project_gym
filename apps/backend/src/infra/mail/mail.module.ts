import { Module } from '@nestjs/common';
import { InvitationDelivery } from '../../domain/accounts/application/messaging/invitation-delivery.ts';
import { InvitationEmailDelivery } from './invitation-email-delivery.ts';
import { MailSender } from '../../domain/accounts/application/messaging/mail-sender.ts';
import { EnvModule } from '../env/env.module.ts';
import { NodemailerMailSender } from './nodemailer-mail-sender.ts';

@Module({
  imports: [EnvModule],
  providers: [
    { provide: MailSender, useClass: NodemailerMailSender },
    { provide: InvitationDelivery, useClass: InvitationEmailDelivery },
  ],
  exports: [MailSender, InvitationDelivery],
})
export class MailModule {}
