import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../../../domain/accounts/application/repositories/users-repository.ts';
import type { User } from '../../../../domain/accounts/enterprise/user.ts';
import { PrismaUserWriteErrorHandler } from '../../../errors/prisma/prisma-user-write-error-handler.ts';
import { PrismaUserMapper } from '../mappers/prisma-user-mapper.ts';
import { PrismaService } from '../prisma.service.ts';

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writeErrorHandler: PrismaUserWriteErrorHandler,
  ) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async create(user: User) {
    return this.writeErrorHandler.execute(() =>
      this.prisma.user.create({
        data: PrismaUserMapper.toPrisma(user),
      }),
    );
  }
}
