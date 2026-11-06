export abstract class InvitationDelivery {
  abstract send(input: {
    email: string;
    name: string;
    token: string;
  }): Promise<boolean>;
}
