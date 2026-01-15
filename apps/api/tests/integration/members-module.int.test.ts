/**
 * Member Management Integration Tests
 *
 * Tests for member management API routes with real database.
 * Verifies:
 * - Member list access control
 * - Invitation create/accept/revoke flow
 * - Role management permissions
 * - Member removal and leave
 * - Ownership transfer
 */
import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

describe('Member Management Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await app.prisma.session.deleteMany({});
    await app.prisma.projectInvitation.deleteMany({});
    await app.prisma.apiKey.deleteMany({});
    await app.prisma.projectMember.deleteMany({});
    await app.prisma.project.deleteMany({
      where: { slug: { contains: 'member-test' } },
    });
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'member-test' } },
    });
  });

  // ==========================================================================
  // Helper functions
  // ==========================================================================

  async function registerUser(email: string, name: string = 'Test User') {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password: 'SecurePass123!',
        name,
      },
    });
    return app.prisma.user.findUnique({ where: { email } });
  }

  async function loginUser(email: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email,
        password: 'SecurePass123!',
      },
    });
    return `token=${response.cookies.find((c) => c.name === 'token')?.value}`;
  }

  async function createProject(cookie: string, slug: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: {
        name: 'Test Project',
        slug,
        languageCodes: ['en'],
        defaultLanguage: 'en',
      },
    });
    return JSON.parse(response.body);
  }

  // ==========================================================================
  // Member List API
  // ==========================================================================

  describe('Member List API', () => {
    it('should return members for project member', async () => {
      // Create owner
      await registerUser('owner-member-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-member-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-list');

      // List members
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${project.id}/members`,
        headers: { cookie: ownerCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.members).toHaveLength(1);
      expect(body.members[0].email).toBe('owner-member-test@example.com');
      expect(body.members[0].role).toBe('OWNER');
    });

    it('should reject non-members with 403', async () => {
      // Create owner and project
      await registerUser('owner-list-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-list-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-reject');

      // Create non-member
      await registerUser('nonmember-list-test@example.com', 'Non Member');
      const nonMemberCookie = await loginUser('nonmember-list-test@example.com');

      // Non-member tries to list members
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${project.id}/members`,
        headers: { cookie: nonMemberCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Invitation API
  // ==========================================================================

  describe('Invitation API', () => {
    it('should create invitation when OWNER invites', async () => {
      // Create owner
      await registerUser('owner-invite-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-invite-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-invite');

      // Invite member
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: ownerCookie },
        payload: {
          emails: ['invitee-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sent).toContain('invitee-member-test@example.com');
      expect(body.skipped).toHaveLength(0);
      expect(body.errors).toHaveLength(0);
    });

    it('should reject invitation from DEVELOPER', async () => {
      // Create owner and project
      await registerUser('owner-dev-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-dev-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-dev');

      // Create developer member
      await registerUser('dev-invite-test@example.com', 'Developer');
      const devUser = await app.prisma.user.findUnique({
        where: { email: 'dev-invite-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: devUser!.id,
          role: 'DEVELOPER',
        },
      });
      const devCookie = await loginUser('dev-invite-test@example.com');

      // Developer tries to invite
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: devCookie },
        payload: {
          emails: ['newuser-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should skip existing members', async () => {
      // Create owner
      await registerUser('owner-skip-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-skip-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-skip');

      // Create existing member
      await registerUser('existing-member-test@example.com', 'Existing');
      const existingUser = await app.prisma.user.findUnique({
        where: { email: 'existing-member-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: existingUser!.id,
          role: 'DEVELOPER',
        },
      });

      // Try to invite existing member
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: ownerCookie },
        payload: {
          emails: ['existing-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sent).toHaveLength(0);
      expect(body.skipped).toContain('existing-member-test@example.com');
    });

    it('should allow MANAGER to invite DEVELOPER only', async () => {
      // Create owner and project
      await registerUser('owner-mgr-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-mgr-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-mgr');

      // Create manager member
      await registerUser('mgr-invite-test@example.com', 'Manager');
      const mgrUser = await app.prisma.user.findUnique({
        where: { email: 'mgr-invite-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: mgrUser!.id,
          role: 'MANAGER',
        },
      });
      const mgrCookie = await loginUser('mgr-invite-test@example.com');

      // Manager can invite as DEVELOPER
      const devResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: mgrCookie },
        payload: {
          emails: ['newdev-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });
      expect(devResponse.statusCode).toBe(200);

      // Manager cannot invite as MANAGER
      const mgrResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: mgrCookie },
        payload: {
          emails: ['newmgr-member-test@example.com'],
          role: 'MANAGER',
        },
      });
      expect(mgrResponse.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Accept Invitation Flow
  // ==========================================================================

  describe('Accept Invitation Flow', () => {
    it('should accept valid invitation and create member', async () => {
      // Create owner and project
      await registerUser('owner-accept-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-accept-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-accept');

      // Invite new user
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: ownerCookie },
        payload: {
          emails: ['acceptee-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });

      // Get the invitation token
      const invitation = await app.prisma.projectInvitation.findFirst({
        where: { email: 'acceptee-member-test@example.com' },
      });

      // Register and login as invitee
      await registerUser('acceptee-member-test@example.com', 'Acceptee');
      const accepteeCookie = await loginUser('acceptee-member-test@example.com');

      // Accept invitation
      const acceptResponse = await app.inject({
        method: 'POST',
        url: `/api/invitations/${invitation!.token}/accept`,
        headers: { cookie: accepteeCookie },
      });

      expect(acceptResponse.statusCode).toBe(204);

      // Verify member was created
      const members = await app.inject({
        method: 'GET',
        url: `/api/projects/${project.id}/members`,
        headers: { cookie: accepteeCookie },
      });

      const membersBody = JSON.parse(members.body);
      expect(membersBody.members).toHaveLength(2);
      expect(
        membersBody.members.some(
          (m: { email: string }) => m.email === 'acceptee-member-test@example.com'
        )
      ).toBe(true);
    });

    it('should reject email mismatch', async () => {
      // Create owner and project
      await registerUser('owner-mismatch-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-mismatch-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-mismatch');

      // Invite a specific email
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: ownerCookie },
        payload: {
          emails: ['invited-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });

      const invitation = await app.prisma.projectInvitation.findFirst({
        where: { email: 'invited-member-test@example.com' },
      });

      // Different user tries to accept
      await registerUser('wrong-member-test@example.com', 'Wrong User');
      const wrongCookie = await loginUser('wrong-member-test@example.com');

      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${invitation!.token}/accept`,
        headers: { cookie: wrongCookie },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject expired invitation', async () => {
      // Create owner and project
      await registerUser('owner-expired-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-expired-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-expired');

      // Create expired invitation directly
      const expiredInvitation = await app.prisma.projectInvitation.create({
        data: {
          projectId: project.id,
          email: 'expired-member-test@example.com',
          role: 'DEVELOPER',
          token: 'expired-token-12345',
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          invitedById: (await app.prisma.user.findUnique({
            where: { email: 'owner-expired-test@example.com' },
          }))!.id,
        },
      });

      // Register and login as invitee
      await registerUser('expired-member-test@example.com', 'Expired User');
      const expiredCookie = await loginUser('expired-member-test@example.com');

      // Try to accept expired invitation
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${expiredInvitation.token}/accept`,
        headers: { cookie: expiredCookie },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should get invitation details (public endpoint)', async () => {
      // Create owner and project
      await registerUser('owner-details-test@example.com', 'Owner User');
      const ownerCookie = await loginUser('owner-details-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-details');

      // Invite new user
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: ownerCookie },
        payload: {
          emails: ['details-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });

      const invitation = await app.prisma.projectInvitation.findFirst({
        where: { email: 'details-member-test@example.com' },
      });

      // Get details without authentication
      const response = await app.inject({
        method: 'GET',
        url: `/api/invitations/${invitation!.token}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.projectName).toBe('Test Project');
      expect(body.projectSlug).toBe('member-test-details');
      expect(body.role).toBe('DEVELOPER');
      expect(body.inviterName).toBe('Owner User');
    });
  });

  // ==========================================================================
  // Role Management API
  // ==========================================================================

  describe('Role Management API', () => {
    it('should allow OWNER to change member to MANAGER', async () => {
      // Create owner and project
      await registerUser('owner-role-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-role-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-role');

      // Create developer member
      await registerUser('dev-role-test@example.com', 'Developer');
      const devUser = await app.prisma.user.findUnique({
        where: { email: 'dev-role-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: devUser!.id,
          role: 'DEVELOPER',
        },
      });

      // Change role to MANAGER
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/projects/${project.id}/members/${devUser!.id}/role`,
        headers: { cookie: ownerCookie },
        payload: { role: 'MANAGER' },
      });

      expect(response.statusCode).toBe(204);

      // Verify role changed
      const member = await app.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: devUser!.id,
          },
        },
      });
      expect(member!.role).toBe('MANAGER');
    });

    it('should reject DEVELOPER role changes', async () => {
      // Create owner and project
      await registerUser('owner-devchange-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-devchange-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-devchange');

      // Create two developers
      await registerUser('dev1-devchange-test@example.com', 'Dev1');
      await registerUser('dev2-devchange-test@example.com', 'Dev2');
      const dev1 = await app.prisma.user.findUnique({
        where: { email: 'dev1-devchange-test@example.com' },
      });
      const dev2 = await app.prisma.user.findUnique({
        where: { email: 'dev2-devchange-test@example.com' },
      });
      await app.prisma.projectMember.createMany({
        data: [
          { projectId: project.id, userId: dev1!.id, role: 'DEVELOPER' },
          { projectId: project.id, userId: dev2!.id, role: 'DEVELOPER' },
        ],
      });
      const dev1Cookie = await loginUser('dev1-devchange-test@example.com');

      // Developer tries to change another developer's role
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/projects/${project.id}/members/${dev2!.id}/role`,
        headers: { cookie: dev1Cookie },
        payload: { role: 'MANAGER' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should prevent last OWNER demotion', async () => {
      // Create owner and project
      await registerUser('sole-owner-test@example.com', 'Sole Owner');
      const ownerCookie = await loginUser('sole-owner-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-sole');

      const owner = await app.prisma.user.findUnique({
        where: { email: 'sole-owner-test@example.com' },
      });

      // Try to demote self (only owner)
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/projects/${project.id}/members/${owner!.id}/role`,
        headers: { cookie: ownerCookie },
        payload: { role: 'DEVELOPER' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('last');
    });
  });

  // ==========================================================================
  // Remove Member API
  // ==========================================================================

  describe('Remove Member API', () => {
    it('should allow OWNER to remove member', async () => {
      // Create owner and project
      await registerUser('owner-remove-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-remove-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-remove');

      // Create developer member
      await registerUser('dev-remove-test@example.com', 'Developer');
      const devUser = await app.prisma.user.findUnique({
        where: { email: 'dev-remove-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: devUser!.id,
          role: 'DEVELOPER',
        },
      });

      // Remove member
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${project.id}/members/${devUser!.id}`,
        headers: { cookie: ownerCookie },
      });

      expect(response.statusCode).toBe(204);

      // Verify member removed
      const member = await app.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: devUser!.id,
          },
        },
      });
      expect(member).toBeNull();
    });

    it('should reject non-OWNER removal', async () => {
      // Create owner and project
      await registerUser('owner-nonremove-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-nonremove-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-nonremove');

      // Create manager and developer
      await registerUser('mgr-nonremove-test@example.com', 'Manager');
      await registerUser('dev-nonremove-test@example.com', 'Developer');
      const mgrUser = await app.prisma.user.findUnique({
        where: { email: 'mgr-nonremove-test@example.com' },
      });
      const devUser = await app.prisma.user.findUnique({
        where: { email: 'dev-nonremove-test@example.com' },
      });
      await app.prisma.projectMember.createMany({
        data: [
          { projectId: project.id, userId: mgrUser!.id, role: 'MANAGER' },
          { projectId: project.id, userId: devUser!.id, role: 'DEVELOPER' },
        ],
      });
      const mgrCookie = await loginUser('mgr-nonremove-test@example.com');

      // Manager tries to remove developer
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${project.id}/members/${devUser!.id}`,
        headers: { cookie: mgrCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Leave Project API
  // ==========================================================================

  describe('Leave Project API', () => {
    it('should allow member to leave', async () => {
      // Create owner and project
      await registerUser('owner-leave-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-leave-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-leave');

      // Create developer member
      await registerUser('dev-leave-test@example.com', 'Developer');
      const devUser = await app.prisma.user.findUnique({
        where: { email: 'dev-leave-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: devUser!.id,
          role: 'DEVELOPER',
        },
      });
      const devCookie = await loginUser('dev-leave-test@example.com');

      // Developer leaves
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/leave`,
        headers: { cookie: devCookie },
      });

      expect(response.statusCode).toBe(204);

      // Verify member removed
      const member = await app.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: devUser!.id,
          },
        },
      });
      expect(member).toBeNull();
    });

    it('should prevent sole OWNER from leaving', async () => {
      // Create owner and project
      await registerUser('soleowner-leave-test@example.com', 'Sole Owner');
      const ownerCookie = await loginUser('soleowner-leave-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-soleleave');

      // Sole owner tries to leave
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/leave`,
        headers: { cookie: ownerCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message.toLowerCase()).toContain('owner');
    });
  });

  // ==========================================================================
  // Transfer Ownership API
  // ==========================================================================

  describe('Transfer Ownership API', () => {
    it('should transfer ownership to member', async () => {
      // Create owner and project
      await registerUser('owner-transfer-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-transfer-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-transfer');

      // Create developer member
      await registerUser('dev-transfer-test@example.com', 'Developer');
      const devUser = await app.prisma.user.findUnique({
        where: { email: 'dev-transfer-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: devUser!.id,
          role: 'DEVELOPER',
        },
      });

      // Transfer ownership
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/transfer-ownership`,
        headers: { cookie: ownerCookie },
        payload: {
          newOwnerId: devUser!.id,
          keepOwnership: true,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify new owner
      const newOwner = await app.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: devUser!.id,
          },
        },
      });
      expect(newOwner!.role).toBe('OWNER');
    });

    it('should demote previous owner when keepOwnership=false with multiple owners', async () => {
      // Create two owners
      await registerUser('owner1-keepfalse-test@example.com', 'Owner1');
      const owner1Cookie = await loginUser('owner1-keepfalse-test@example.com');
      const project = await createProject(owner1Cookie, 'member-test-keepfalse');

      await registerUser('owner2-keepfalse-test@example.com', 'Owner2');
      const owner2 = await app.prisma.user.findUnique({
        where: { email: 'owner2-keepfalse-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: owner2!.id,
          role: 'OWNER',
        },
      });

      const owner1 = await app.prisma.user.findUnique({
        where: { email: 'owner1-keepfalse-test@example.com' },
      });

      // Transfer with keepOwnership=false
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/transfer-ownership`,
        headers: { cookie: owner1Cookie },
        payload: {
          newOwnerId: owner2!.id,
          keepOwnership: false,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify owner1 is now MANAGER (demoted)
      const oldOwner = await app.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: owner1!.id,
          },
        },
      });
      expect(oldOwner!.role).toBe('MANAGER');
    });

    it('should reject non-OWNER transfer', async () => {
      // Create owner and project
      await registerUser('owner-nontransfer-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-nontransfer-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-nontransfer');

      // Create manager and developer
      await registerUser('mgr-nontransfer-test@example.com', 'Manager');
      await registerUser('dev-nontransfer-test@example.com', 'Developer');
      const mgrUser = await app.prisma.user.findUnique({
        where: { email: 'mgr-nontransfer-test@example.com' },
      });
      const devUser = await app.prisma.user.findUnique({
        where: { email: 'dev-nontransfer-test@example.com' },
      });
      await app.prisma.projectMember.createMany({
        data: [
          { projectId: project.id, userId: mgrUser!.id, role: 'MANAGER' },
          { projectId: project.id, userId: devUser!.id, role: 'DEVELOPER' },
        ],
      });
      const mgrCookie = await loginUser('mgr-nontransfer-test@example.com');

      // Manager tries to transfer
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/transfer-ownership`,
        headers: { cookie: mgrCookie },
        payload: {
          newOwnerId: devUser!.id,
          keepOwnership: true,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Revoke Invitation API
  // ==========================================================================

  describe('Revoke Invitation API', () => {
    it('should allow MANAGER to revoke invitation', async () => {
      // Create owner and project
      await registerUser('owner-revoke-test@example.com', 'Owner');
      const ownerCookie = await loginUser('owner-revoke-test@example.com');
      const project = await createProject(ownerCookie, 'member-test-revoke');

      // Create manager
      await registerUser('mgr-revoke-test@example.com', 'Manager');
      const mgrUser = await app.prisma.user.findUnique({
        where: { email: 'mgr-revoke-test@example.com' },
      });
      await app.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: mgrUser!.id,
          role: 'MANAGER',
        },
      });
      const mgrCookie = await loginUser('mgr-revoke-test@example.com');

      // Owner creates invitation
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/invitations`,
        headers: { cookie: ownerCookie },
        payload: {
          emails: ['revokee-member-test@example.com'],
          role: 'DEVELOPER',
        },
      });

      const invitation = await app.prisma.projectInvitation.findFirst({
        where: { email: 'revokee-member-test@example.com' },
      });

      // Manager revokes
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${project.id}/invitations/${invitation!.id}`,
        headers: { cookie: mgrCookie },
      });

      expect(response.statusCode).toBe(204);

      // Verify revoked
      const revokedInvitation = await app.prisma.projectInvitation.findUnique({
        where: { id: invitation!.id },
      });
      expect(revokedInvitation!.revokedAt).not.toBeNull();
    });
  });
});
