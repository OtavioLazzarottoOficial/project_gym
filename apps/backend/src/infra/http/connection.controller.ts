import { Public } from '../auth/public.ts';
import { Controller, Get } from '@nestjs/common';
import type { ConnectionCheckResponse } from '@repo/shared/connection-check';

@Public()
@Controller('connection')
export class ConnectionController {
  @Get()
  check(): ConnectionCheckResponse {
    return {
      status: 'ok',
      service: 'backend',
      message: 'Conexão com o backend estabelecida.',
    };
  }
}
