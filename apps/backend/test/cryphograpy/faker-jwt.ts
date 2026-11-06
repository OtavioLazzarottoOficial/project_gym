import { Encrypter } from '../../src/domain/auth/application/crypthograpy/encrypter.ts';

export class FakerJWT implements Encrypter {
  async encrypty(payload: any): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return `jwt-${JSON.stringify(payload)}`;
  }
}
