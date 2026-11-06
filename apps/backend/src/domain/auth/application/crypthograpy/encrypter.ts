export abstract class Encrypter {
  abstract encrypty(payload: Record<string, unknown>): Promise<string>;
}
