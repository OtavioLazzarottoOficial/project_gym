import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../database/prisma/generated/client.ts';
import { PrismaMembershipWriteErrorHandler } from './prisma-membership-write-error-handler.ts';
import { MembershipAlreadyExistsError } from '../../../domain/organizations/application/errors/membership-already-exists-error.ts';

function conflict(modelName: string, target: string[]) {
  return new Prisma.PrismaClientKnownRequestError('private database details', {
    code: 'P2002',
    clientVersion: '7.10.1',
    meta: { modelName, target },
  });
}

describe('Prisma membership write errors', () => {
  const sut = new PrismaMembershipWriteErrorHandler();

  it('translates only the known repeated membership', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(
        conflict('Membership', ['organization_id', 'user_id']),
      );
    const result = await sut.execute(operation);
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MembershipAlreadyExistsError);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('private database details');
  });

  it('retries the known global email race once and preserves success', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(conflict('User', ['email']))
      .mockResolvedValueOnce('registered');
    const result = await sut.execute(operation);
    expect(result.isRight()).toBe(true);
    expect(result.value).toBe('registered');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry a persistent email conflict indefinitely', async () => {
    const failure = conflict('User', ['email']);
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(failure);
    await expect(sut.execute(operation)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it.each([
    conflict('Membership', ['id']),
    new Error('Connection unavailable'),
  ])('preserves unexpected failures without retry', async (failure) => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(failure);
    await expect(sut.execute(operation)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
