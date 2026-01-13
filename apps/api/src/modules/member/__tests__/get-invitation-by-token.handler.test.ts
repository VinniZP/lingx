/**
 * GetInvitationByTokenHandler Unit Tests
 *
 * Tests for retrieving invitation details by token (public endpoint for accept page).
 */

import type { ProjectRole } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { GetInvitationByTokenHandler } from '../queries/get-invitation-by-token.handler.js';
import { GetInvitationByTokenQuery } from '../queries/get-invitation-by-token.query.js';
import type {
  InvitationRepository,
  InvitationWithDetails,
} from '../repositories/invitation.repository.js';

interface MockInvitationRepository {
  findPendingByProject: Mock;
  findByToken: Mock;
  findPendingByEmail: Mock;
  findById: Mock;
  create: Mock;
  markAccepted: Mock;
  markRevoked: Mock;
  countRecentByProject: Mock;
  countRecentByUser: Mock;
}

function createMockInvitationRepository(): MockInvitationRepository {
  return {
    findPendingByProject: vi.fn(),
    findByToken: vi.fn(),
    findPendingByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    markAccepted: vi.fn(),
    markRevoked: vi.fn(),
    countRecentByProject: vi.fn(),
    countRecentByUser: vi.fn(),
  };
}

describe('GetInvitationByTokenHandler', () => {
  let handler: GetInvitationByTokenHandler;
  let mockInvitationRepository: MockInvitationRepository;

  const now = new Date('2024-01-15T12:00:00Z');
  const futureDate = new Date('2024-01-22T12:00:00Z'); // 7 days later
  const pastDate = new Date('2024-01-10T12:00:00Z'); // 5 days ago

  const validInvitation: InvitationWithDetails = {
    id: 'inv-1',
    email: 'new-user@example.com',
    role: 'DEVELOPER' as ProjectRole,
    token: 'valid-token',
    expiresAt: futureDate,
    acceptedAt: null,
    revokedAt: null,
    createdAt: new Date('2024-01-15'),
    project: { id: 'project-1', name: 'My Project', slug: 'my-project' },
    invitedBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockInvitationRepository = createMockInvitationRepository();
    handler = new GetInvitationByTokenHandler(
      mockInvitationRepository as unknown as InvitationRepository
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    it('should return invitation details for valid token', async () => {
      // Arrange
      mockInvitationRepository.findByToken.mockResolvedValue(validInvitation);

      const query = new GetInvitationByTokenQuery('valid-token');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual({
        projectName: 'My Project',
        projectSlug: 'my-project',
        role: 'DEVELOPER',
        inviterName: 'Alice',
        email: 'new-user@example.com',
        expiresAt: futureDate.toISOString(),
      });
      expect(mockInvitationRepository.findByToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw NotFoundError when token does not exist', async () => {
      // Arrange
      mockInvitationRepository.findByToken.mockResolvedValue(null);

      const query = new GetInvitationByTokenQuery('nonexistent-token');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Invitation');
    });

    it('should throw BadRequestError when invitation is expired', async () => {
      // Arrange
      const expiredInvitation: InvitationWithDetails = {
        ...validInvitation,
        expiresAt: pastDate, // Already expired
      };
      mockInvitationRepository.findByToken.mockResolvedValue(expiredInvitation);

      const query = new GetInvitationByTokenQuery('expired-token');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('invitation has expired');
    });

    it('should throw BadRequestError when invitation is already accepted', async () => {
      // Arrange
      const acceptedInvitation: InvitationWithDetails = {
        ...validInvitation,
        acceptedAt: new Date('2024-01-14'),
      };
      mockInvitationRepository.findByToken.mockResolvedValue(acceptedInvitation);

      const query = new GetInvitationByTokenQuery('accepted-token');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('invitation has already been accepted');
    });

    it('should throw BadRequestError when invitation is revoked', async () => {
      // Arrange
      const revokedInvitation: InvitationWithDetails = {
        ...validInvitation,
        revokedAt: new Date('2024-01-14'),
      };
      mockInvitationRepository.findByToken.mockResolvedValue(revokedInvitation);

      const query = new GetInvitationByTokenQuery('revoked-token');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('invitation has been revoked');
    });

    it('should handle null inviter name', async () => {
      // Arrange
      const invitationWithNullInviter: InvitationWithDetails = {
        ...validInvitation,
        invitedBy: { id: 'user-1', name: null, email: 'alice@example.com' },
      };
      mockInvitationRepository.findByToken.mockResolvedValue(invitationWithNullInviter);

      const query = new GetInvitationByTokenQuery('valid-token');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.inviterName).toBeNull();
    });
  });
});
