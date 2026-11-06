import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticateUserUseCase } from './authenticate-user-usecase.ts';
import { InvalidCredentialsError } from '../errors/invalid-credentials-error.ts';
import { UsersRepository } from '../../../accounts/application/repositories/users-repository.ts';
import { AuthSessionsRepository } from '../repositories/auth-sessions-repository.ts';
import { HashComparer } from '../crypthograpy/hash-comparer.ts';
import { Encrypter } from '../crypthograpy/encrypter.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { AuthSessionsRepositoryInMemory } from '../../../../../test/repository-in-memory/auth-sessions-repository-in-memory.ts';
import { FakerEncrypter } from '../../../../../test/cryphograpy/faker-encrypter.ts';
import { FakerJWT } from '../../../../../test/cryphograpy/faker-jwt.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';

describe('Authenticate user', () => {
  let sut: AuthenticateUserUseCase;
  let usersRepository: UsersRepositoryInMemory;
  let sessionsRepository: AuthSessionsRepositoryInMemory;
  let hasher: FakerEncrypter;
  let encrypter: FakerJWT;
  const now = new Date('2026-11-04T14:00:00.789Z');
  const credentials = { email: 'maria@example.com', password: 'Secure123' };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    usersRepository = new UsersRepositoryInMemory();
    sessionsRepository = new AuthSessionsRepositoryInMemory();
    hasher = new FakerEncrypter();
    encrypter = new FakerJWT();
    sut = new AuthenticateUserUseCase(
      usersRepository,
      hasher,
      encrypter,
      sessionsRepository,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([false, true])(
    'authenticates identity (platform admin %s) with a fixed 8-hour session',
    async (isPlatformAdmin) => {
      const user = makeUser({
        is_platform_admin: isPlatformAdmin,
        email: credentials.email,
        password_hash: await hasher.hash(credentials.password),
      });
      await usersRepository.create(user);
      const compare = vi.spyOn(hasher, 'compare');
      const sign = vi.spyOn(encrypter, 'encrypty');

      const result = await sut.execute({
        ...credentials,
        email: ' MARIA@EXAMPLE.COM ',
      });

      expect(result.isRight()).toBe(true);

      if (result.isLeft()) {
        throw result.value;
      }

      expect(compare).toHaveBeenCalledWith(
        credentials.password,
        user.password_hash,
      );
      expect(sessionsRepository.items).toHaveLength(1);
      const session = sessionsRepository.items[0];
      expect(session.user_id.equals(user.id)).toBe(true);
      expect(session.expires_at.getTime() - session.created_at.getTime()).toBe(
        8 * 60 * 60 * 1000,
      );
      expect(result.value.expires_at).toEqual(session.expires_at);
      expect(result.value.user).toBe(user);
      expect(sign).toHaveBeenCalledWith({
        sub: user.id.toString(),
        sid: session.id.toString(),
        iat: session.created_at.getTime() / 1000,
        exp: session.expires_at.getTime() / 1000,
      });
      expect(JSON.stringify(sign.mock.calls)).not.toContain(
        credentials.password,
      );
      expect(JSON.stringify(sign.mock.calls)).not.toContain('hashed-');
      expect(sign.mock.calls[0][0]).not.toHaveProperty('role');
    },
  );

  it.each([
    { email: 'invalid' },
    { email: '' },
    { password: '' },
    { password: 'Ab1' + 'é'.repeat(35) },
  ])(
    'rejects malformed credentials without reads or effects: %j',
    async (overrides) => {
      const find = vi.spyOn(usersRepository, 'findByEmail');
      const sign = vi.spyOn(encrypter, 'encrypty');
      const result = await sut.execute({ ...credentials, ...overrides });

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InvalidCredentialsError);
      expect(find).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
      expect(sessionsRepository.items).toHaveLength(0);
    },
  );

  it.each(['unknown', 'pending', 'wrong-password'])(
    'returns the same error for %s without issuing access',
    async (scenario) => {
      if (scenario !== 'unknown') {
        await usersRepository.create(
          makeUser({
            email: credentials.email,
            password_hash:
              scenario === 'pending' ? null : 'hashed-Different123',
          }),
        );
      }

      const sign = vi.spyOn(encrypter, 'encrypty');
      const result = await sut.execute(credentials);

      expect(result.isLeft()).toBe(true);
      expect(result.value).toEqual(new InvalidCredentialsError());
      expect(sign).not.toHaveBeenCalled();
      expect(sessionsRepository.items).toHaveLength(0);
    },
  );

  it('compares the exact password including whitespace', async () => {
    await usersRepository.create(
      makeUser({
        email: credentials.email,
        password_hash: await hasher.hash(' Secure123 '),
      }),
    );

    expect((await sut.execute(credentials)).isLeft()).toBe(true);
    expect(
      (
        await sut.execute({ ...credentials, password: ' Secure123 ' })
      ).isRight(),
    ).toBe(true);
  });

  it('creates independent sessions for separate logins', async () => {
    await usersRepository.create(
      makeUser({
        email: credentials.email,
        password_hash: await hasher.hash(credentials.password),
      }),
    );

    const results = await Promise.all([
      sut.execute(credentials),
      sut.execute(credentials),
    ]);

    expect(results.every((result) => result.isRight())).toBe(true);
    expect(sessionsRepository.items).toHaveLength(2);
    expect(
      sessionsRepository.items[0].id.equals(sessionsRepository.items[1].id),
    ).toBe(false);
  });

  it('propagates read failures without creating a session', async () => {
    const failure = new Error('Database unavailable');
    vi.spyOn(usersRepository, 'findByEmail').mockRejectedValueOnce(failure);

    await expect(sut.execute(credentials)).rejects.toBe(failure);
    expect(sessionsRepository.items).toHaveLength(0);
  });

  it.each(['compare', 'sign', 'persist'])(
    'propagates %s failures instead of returning success',
    async (stage) => {
      await usersRepository.create(
        makeUser({
          email: credentials.email,
          password_hash: await hasher.hash(credentials.password),
        }),
      );
      const failure = new Error('Infrastructure failure');

      if (stage === 'compare') {
        vi.spyOn(hasher, 'compare').mockRejectedValueOnce(failure);
      }

      if (stage === 'sign') {
        vi.spyOn(encrypter, 'encrypty').mockRejectedValueOnce(failure);
      }

      if (stage === 'persist') {
        vi.spyOn(sessionsRepository, 'create').mockRejectedValueOnce(failure);
      }

      await expect(sut.execute(credentials)).rejects.toBe(failure);
      expect(sessionsRepository.items).toHaveLength(0);
    },
  );

  it('rejects a login if its verified password changed before session creation', async () => {
    await usersRepository.create(
      makeUser({
        email: credentials.email,
        password_hash: await hasher.hash(credentials.password),
      }),
    );
    vi.spyOn(
      sessionsRepository,
      'createIfPasswordMatches',
    ).mockResolvedValueOnce(false);
    const result = await sut.execute(credentials);
    expect(result.value).toBeInstanceOf(InvalidCredentialsError);
    expect(sessionsRepository.items).toHaveLength(0);
  });

  it('resolves dependencies using Nest metadata without @Inject parameters', async () => {
    await usersRepository.create(
      makeUser({
        email: credentials.email,
        password_hash: await hasher.hash(credentials.password),
      }),
    );
    const module = await Test.createTestingModule({
      providers: [
        AuthenticateUserUseCase,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: HashComparer, useValue: hasher },
        { provide: Encrypter, useValue: encrypter },
        { provide: AuthSessionsRepository, useValue: sessionsRepository },
      ],
    }).compile();

    expect(
      (
        await module.get(AuthenticateUserUseCase).execute(credentials)
      ).isRight(),
    ).toBe(true);
    expect(sessionsRepository.items).toHaveLength(1);
    await module.close();
  });
});
