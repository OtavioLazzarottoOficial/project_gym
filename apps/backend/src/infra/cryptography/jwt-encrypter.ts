import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Encrypter } from '../../domain/auth/application/crypthograpy/encrypter.ts';

@Injectable()
export class JwtEncrypter implements Encrypter {
  constructor(@Inject(JwtService) private jwtService: JwtService) {}

  encrypty(payload: Record<string, unknown>): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
