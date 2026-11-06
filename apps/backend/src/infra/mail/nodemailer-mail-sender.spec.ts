import { beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { NodemailerMailSender } from './nodemailer-mail-sender.ts';
import { EmailDeliveryError } from '../errors/email-delivery-error.ts';
import type { EnvService } from '../env/env.service.ts';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));

describe('NodemailerMailSender', () => {
  const sendMail = vi.fn();
  const config: Record<string, string | number> = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 465,
    SMTP_USER: 'test@example.com',
    SMTP_PASS: 'abcd efgh',
    SMTP_FROM: '',
  };
  let sut: NodemailerMailSender;

  beforeEach(() => {
    vi.clearAllMocks();
    config.SMTP_USER = 'test@example.com';
    config.SMTP_PASS = 'abcd efgh';
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);
    sendMail.mockResolvedValue({
      accepted: ['recipient@example.com'],
      rejected: [],
    });
    sut = new NodemailerMailSender({
      get: (key: string) => config[key],
    } as unknown as EnvService);
  });

  it('uses Gmail TLS, a reused transport, and does not modify the message', async () => {
    const message = {
      to: 'recipient@example.com',
      subject: 'Convite',
      text: 'Acesse seu convite.',
    };
    await sut.send(message);
    await sut.send(message);
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        requireTLS: true,
        auth: { user: 'test@example.com', pass: 'abcdefgh' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: 'test@example.com',
      ...message,
    });
  });

  it('rejects missing credentials without connecting', async () => {
    config.SMTP_PASS = '';
    await expect(
      sut.send({
        to: 'recipient@example.com',
        subject: 'Convite',
        text: 'Texto',
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('does not expose SMTP errors or secrets', async () => {
    sendMail.mockRejectedValueOnce(new Error('private SMTP credentials'));
    await expect(
      sut.send({
        to: 'recipient@example.com',
        subject: 'Convite',
        text: 'Texto',
      }),
    ).rejects.toThrow('Não foi possível enviar o email.');
  });

  it('rejects a delivery refused by the transport', async () => {
    sendMail.mockResolvedValueOnce({
      accepted: [],
      rejected: ['recipient@example.com'],
    });
    await expect(
      sut.send({
        to: 'recipient@example.com',
        subject: 'Convite',
        text: 'Texto',
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
  });
});
