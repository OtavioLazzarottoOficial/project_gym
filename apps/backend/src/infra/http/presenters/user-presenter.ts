import type { User } from '../../../domain/accounts/enterprise/user.ts';

export class UserPresenter {
  static toHTTP(user: User) {
    return {
      id: user.id.toString(),
      name: user.name.value,
      email: user.email.value,
      is_platform_admin: user.is_platform_admin,
      awaiting_password: user.isAwaitingPassword,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at?.toISOString() ?? null,
    };
  }
}
