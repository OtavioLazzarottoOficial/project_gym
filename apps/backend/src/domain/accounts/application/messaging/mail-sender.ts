export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export abstract class MailSender {
  abstract send(message: EmailMessage): Promise<void>;
}
