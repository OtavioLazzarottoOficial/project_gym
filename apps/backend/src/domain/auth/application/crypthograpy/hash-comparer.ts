export abstract class HashComparer {
  abstract compare(value: string, hashedValue: string): Promise<boolean>;
}
