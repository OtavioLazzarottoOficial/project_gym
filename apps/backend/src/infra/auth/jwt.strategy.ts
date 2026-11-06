import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvService } from '../env/env.service.ts';
import { z } from 'zod';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ValidateSessionUseCase } from '../../domain/auth/application/usecases/validate-session-usecase.ts';
import type { User } from '../../domain/accounts/enterprise/user.ts';

const tokenPayloadSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  iat: z.int().nonnegative(),
  exp: z.int().positive(),
});

export type UserPayload = { sub: string; sid: string; user: User };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: EnvService,
    private readonly validateSession: ValidateSessionUseCase,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Buffer.from(config.get('JWT_PUBLIC_KEY'), 'base64'),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: unknown): Promise<UserPayload> {
    const parsed = tokenPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      throw new UnauthorizedException('Token inválido.');
    }

    const result = await this.validateSession.execute({
      userId: parsed.data.sub,
      sessionId: parsed.data.sid,
    });

    if (result.isLeft()) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    if (
      parsed.data.iat !==
        Math.floor(result.value.session.created_at.getTime() / 1000) ||
      parsed.data.exp !==
        Math.floor(result.value.session.expires_at.getTime() / 1000)
    ) {
      throw new UnauthorizedException('Token inválido.');
    }

    return {
      sub: parsed.data.sub,
      sid: parsed.data.sid,
      user: result.value.user,
    };
  }
}
