import { describe, expect, it } from 'vitest';
import { BcryptHasher } from './bcrypt-hasher.ts';
import { ZodValidationPipe } from '../http/pipes/zod-validation-pipe.ts';
import { z } from 'zod';

describe('infraestrutura de criptografia e validação', () => {
  it('gera hash e compara a senha sem guardar texto puro', async () => {
    const hasher = new BcryptHasher();
    const hash = await hasher.hash('senha-de-teste');
    expect(hash).not.toBe('senha-de-teste');
    expect(await hasher.compare('senha-de-teste', hash)).toBe(true);
    expect(await hasher.compare('senha-errada', hash)).toBe(false);
  });
  it('valida dados e retorna erro HTTP 400 para dados inválidos', () => {
    const pipe = new ZodValidationPipe(z.object({ name: z.string().min(2) }));
    expect(pipe.transform({ name: 'Maria' })).toEqual({ name: 'Maria' });
    expect(() => pipe.transform({ name: '' })).toThrow('Validation failed');
  });
});
