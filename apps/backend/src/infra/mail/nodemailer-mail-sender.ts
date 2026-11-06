import { Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  MailSender,
  type EmailMessage,
} from '../../domain/accounts/application/messaging/mail-sender.ts';
import { EnvService } from '../env/env.service.ts';
import { EmailDeliveryError } from '../errors/email-delivery-error.ts';

@Injectable()
export class NodemailerMailSender extends MailSender {
  private transporter?: Transporter;

  constructor(private readonly env: EnvService) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const user = this.env.get('SMTP_USER').trim();
    const password = this.env.get('SMTP_PASS').replace(/\s+/g, '');
    const from = this.env.get('SMTP_FROM').trim() || user;

    if (!user || !password || !from) {
      throw new EmailDeliveryError();
    }

    try {
      this.transporter ??= nodemailer.createTransport({
        host: this.env.get('SMTP_HOST'),
        port: Number(this.env.get('SMTP_PORT')),
        secure: Number(this.env.get('SMTP_PORT')) === 465,
        requireTLS: true,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        auth: { user, pass: password },
      });
      const result = await this.transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });

      if (!result.accepted?.length || (result.rejected?.length ?? 0) > 0) {
        throw new EmailDeliveryError();
      }
    } catch {
      throw new EmailDeliveryError();
    }
  }
}
