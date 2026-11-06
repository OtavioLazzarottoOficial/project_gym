export abstract class HashGenerator {
  abstract hash(value: string): Promise<string>;
}
