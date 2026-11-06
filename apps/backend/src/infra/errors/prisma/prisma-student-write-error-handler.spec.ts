import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../database/prisma/generated/client.ts';
import { PrismaStudentWriteErrorHandler } from './prisma-student-write-error-handler.ts';
import { StudentAlreadyExistsError } from '../../../domain/students/application/errors/student-already-exists-error.ts';
import { StudentIdentityConflictError } from '../../../domain/students/application/errors/student-identity-conflict-error.ts';

function conflict(modelName: string, target: string[]) {
  return new Prisma.PrismaClientKnownRequestError('private database details', {
    code: 'P2002',
    clientVersion: '7.10.1',
    meta: { modelName, target },
  });
}

describe('Prisma student write error handler', () => {
  const sut = new PrismaStudentWriteErrorHandler();
  it('translates CPF conflict without exposing database details', async () => {
    const result = await sut.execute(
      vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(conflict('User', ['cpf'])),
    );
    expect(result.value).toBeInstanceOf(StudentIdentityConflictError);
    expect(JSON.stringify(result)).not.toContain('private database details');
  });
  it.each([
    { fields: ['membership_id'] },
    { fields: ['membership_id', 'organization_id'] },
  ])('translates a duplicate student constraint', async ({ fields }) => {
    const result = await sut.execute(
      vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(conflict('Student', fields)),
    );
    expect(result.value).toBeInstanceOf(StudentAlreadyExistsError);
  });
  it('retries the known email race once', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(conflict('User', ['email']))
      .mockResolvedValueOnce('ok');
    expect((await sut.execute(operation)).value).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
  it('preserves unrelated unique and database failures', async () => {
    for (const failure of [
      conflict('Student', ['id']),
      new Error('Database unavailable'),
    ]) {
      await expect(
        sut.execute(vi.fn<() => Promise<string>>().mockRejectedValue(failure)),
      ).rejects.toBe(failure);
    }
  });
});
