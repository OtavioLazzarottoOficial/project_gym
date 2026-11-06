import { Module } from '@nestjs/common';
import { EnvService } from './env.service.ts';

@Module({
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}
