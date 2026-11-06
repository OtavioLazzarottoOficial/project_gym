import { Injectable } from '@nestjs/common';
import { InvitationDelivery } from '../../domain/accounts/application/messaging/invitation-delivery.ts';
import { MailSender } from '../../domain/accounts/application/messaging/mail-sender.ts';
import { EnvService } from '../env/env.service.ts';
import { EmailDeliveryError } from '../errors/email-delivery-error.ts';

@Injectable()
export class InvitationEmailDelivery extends InvitationDelivery {
  constructor(
    private readonly mail: MailSender,
    private readonly env: EnvService,
  ) {
    super();
  }

  async send(input: {
    email: string;
    name: string;
    token: string;
  }): Promise<boolean> {
    const link = new URL('/define-password', this.env.get('FRONTEND_URL'));
    link.hash = new URLSearchParams({ token: input.token }).toString();
    try {
      await this.mail.send({
        to: input.email,
        subject: 'Project Gym — defina sua senha',
        text: `Olá, ${input.name}!\n\nPara definir sua senha e acessar o Project Gym, acesse o link abaixo. Ele é válido por 24 horas e pode ser usado uma vez.\n\n${link.toString()}`,
      });
      return true;
    } catch (error) {
      if (!(error instanceof EmailDeliveryError)) throw error;
      return false;
    }
  }
}
