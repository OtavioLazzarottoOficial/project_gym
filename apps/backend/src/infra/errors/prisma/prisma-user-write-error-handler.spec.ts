import { describe, expect, it } from 'vitest';
import { Prisma } from '../../database/prisma/generated/client.ts';
import { PrismaUserWriteErrorHandler } from './prisma-user-write-error-handler.ts';
import { UserAlreadyExistsError } from '../../../domain/accounts/application/errors/user-already-exists-error.ts';

describe('PrismaUserWriteErrorHandler', () => {
  const sut = new PrismaUserWriteErrorHandler();

  it('returns Right for a completed write', async () => {
    expect((await sut.execute(async () => undefined)).isRight()).toBe(true);
  });

  it.each([
    { modelName: 'User', target: ['email'] },
    {
      modelName: 'User',
      driverAdapterError: {
        cause: { constraint: { index: 'users_email_key' } },
      },
    },
  ])('translates only the known email conflict', async (meta) => {
    const failure = new Prisma.PrismaClientKnownRequestError(
      'private database details',
      { code: 'P2002', clientVersion: '7.10.1', meta },
    );
    const result = await sut.execute(() => Promise.reject(failure));

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(UserAlreadyExistsError);
    expect(JSON.stringify(result)).not.toContain('private database details');
  });

  it.each([
    { modelName: 'User', target: ['id'] },
    { modelName: 'Other', target: ['email'] },
    {
      modelName: 'User',
      driverAdapterError: { cause: { constraint: { index: 'users_pkey' } } },
    },
    {},
  ])('preserves unknown unique conflicts', async (meta) => {
    const failure = new Prisma.PrismaClientKnownRequestError(
      'unexpected conflict',
      { code: 'P2002', clientVersion: '7.10.1', meta },
    );

    await expect(sut.execute(() => Promise.reject(failure))).rejects.toBe(
      failure,
    );
  });

  it('propagates unexpected failures', async () => {
    const failure = new Error('Database unavailable');

    await expect(sut.execute(() => Promise.reject(failure))).rejects.toBe(
      failure,
    );
  });
});
