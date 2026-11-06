export abstract class InvitationTokens {
  abstract generate(): string;
  abstract hash(token: string): string;
}
