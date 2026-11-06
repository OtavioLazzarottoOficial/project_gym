import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IssueInvitationUseCase } from './issue-invitation-usecase.ts';
import { AcceptInvitationUseCase } from './accept-invitation-usecase.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import { SecureInvitationTokens } from '../../../../infra/cryptography/secure-invitation-tokens.ts';
import { UserRole } from '../../enterprise/enums/user-role.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';
import { makeOrganization } from '../../../../../test/factories/make-organization.ts';
import { makeMembership } from '../../../../../test/factories/make-membership.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { OrganizationsRepositoryInMemory } from '../../../../../test/repository-in-memory/organizations-repository-in-memory.ts';
import { MembershipsRepositoryInMemory } from '../../../../../test/repository-in-memory/memberships-repository-in-memory.ts';
import { InvitationsRepositoryInMemory } from '../../../../../test/repository-in-memory/invitations-repository-in-memory.ts';

describe('Invitation flow', () => {
  let users: UsersRepositoryInMemory;
  let invitations: InvitationsRepositoryInMemory;
  let issue: IssueInvitationUseCase;
  let accept: AcceptInvitationUseCase;
  let send = vi.fn(
    async (_input: {
      email: string;
      name: string;
      token: string;
    }): Promise<boolean> => true,
  );
  let adminId: string;
  let organizationId: string;
  let userId: string;

  beforeEach(async () => {
    users = new UsersRepositoryInMemory();
    const organizations = new OrganizationsRepositoryInMemory();
    const memberships = new MembershipsRepositoryInMemory(users);
    invitations = new InvitationsRepositoryInMemory(users);
    const org = makeOrganization();
    const admin = makeUser({ password_hash: 'admin-hash' });
    const student = makeUser({ password_hash: null });
    await organizations.create(org);
    await memberships.register(
      admin,
      makeMembership({
        user_id: admin.id,
        organization_id: org.id,
        role: UserRole.ADMIN,
      }),
    );
    await memberships.register(
      student,
      makeMembership({
        user_id: student.id,
        organization_id: org.id,
        role: UserRole.STUDENT,
      }),
    );
    adminId = admin.id.toString();
    organizationId = org.id.toString();
    userId = student.id.toString();
    const tokens = new SecureInvitationTokens();
    send = vi.fn(
      async (_input: {
        email: string;
        name: string;
        token: string;
      }): Promise<boolean> => true,
    );
    issue = new IssueInvitationUseCase(
      new OrganizationAccess(users, organizations, memberships),
      users,
      memberships,
      invitations,
      tokens,
      { send },
    );
    accept = new AcceptInvitationUseCase(invitations, tokens, {
      hash: async (value) => `hash:${value}`,
    });
  });

  it('emails a token, stores only its hash, and sets the password once', async () => {
    const result = await issue.execute({
      requestedBy: adminId,
      organizationId,
      userId,
    });
    expect(result.value).toEqual({ status: 'sent' });
    const token = send.mock.calls[0][0].token as string;
    expect(invitations.items[0].tokenHash).not.toBe(token);
    expect(
      (await accept.execute({ token, password: 'Password123' })).isRight(),
    ).toBe(true);
    expect((await users.findById(userId))?.password_hash).toBe(
      'hash:Password123',
    );
    expect(
      (await accept.execute({ token, password: 'Password123' })).isLeft(),
    ).toBe(true);
  });

  it('invalidates a previous link when reissued', async () => {
    await issue.execute({ requestedBy: adminId, organizationId, userId });
    const first = send.mock.calls[0][0].token as string;
    await issue.execute({ requestedBy: adminId, organizationId, userId });
    const second = send.mock.calls[1][0].token as string;
    expect(
      (
        await accept.execute({ token: first, password: 'Password123' })
      ).isLeft(),
    ).toBe(true);
    expect(
      (
        await accept.execute({ token: second, password: 'Password123' })
      ).isRight(),
    ).toBe(true);
  });

  it('rejects expired links and weak passwords without changing the user', async () => {
    await issue.execute({ requestedBy: adminId, organizationId, userId });
    const token = send.mock.calls[0][0].token as string;
    expect((await accept.execute({ token, password: 'weak' })).isLeft()).toBe(
      true,
    );
    invitations.items[0].expiresAt = new Date(Date.now() - 1);
    expect(
      (await accept.execute({ token, password: 'Password123' })).isLeft(),
    ).toBe(true);
    expect((await users.findById(userId))?.password_hash).toBeNull();
  });

  it('reports mail failures without deleting the pending account', async () => {
    send.mockResolvedValue(false);
    const result = await issue.execute({
      requestedBy: adminId,
      organizationId,
      userId,
    });
    expect(result.value).toEqual({ status: 'delivery_failed' });
    expect((await users.findById(userId))?.isAwaitingPassword).toBe(true);
  });

  it('forbids users without administrative access', async () => {
    const result = await issue.execute({
      requestedBy: userId,
      organizationId,
      userId,
    });
    expect(result.isLeft()).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });
});
