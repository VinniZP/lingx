import type { PrismaClient } from '@prisma/client';
import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { OwnershipTransferredEvent } from '../events/ownership-transferred.event.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { TransferOwnershipCommand } from './transfer-ownership.command.js';

/**
 * Handler for TransferOwnershipCommand.
 * Transfers ownership to another project member.
 *
 * Uses a transaction to ensure atomicity of:
 * - Promoting target to OWNER
 * - Optionally demoting current owner to MANAGER
 */
export class TransferOwnershipHandler implements ICommandHandler<TransferOwnershipCommand> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly eventBus: IEventBus,
    private readonly prisma: PrismaClient
  ) {}

  async execute(
    command: TransferOwnershipCommand
  ): Promise<InferCommandResult<TransferOwnershipCommand>> {
    const { projectId, newOwnerId, currentOwnerId, keepOwnership } = command;

    // 1. Verify actor is a member and is OWNER
    const actor = await this.memberRepository.findMemberByUserId(projectId, currentOwnerId);
    if (!actor) {
      throw new ForbiddenError('You are not a member of this project');
    }

    if (actor.role !== 'OWNER') {
      throw new ForbiddenError('Only owners can transfer ownership');
    }

    // 2. Find target member
    const target = await this.memberRepository.findMemberByUserId(projectId, newOwnerId);
    if (!target) {
      throw new ForbiddenError('Target user is not a member of this project');
    }

    // 3. Perform ownership transfer atomically
    let previousOwnerKeptOwnership = true;

    await this.prisma.$transaction(async (tx) => {
      // Promote target to OWNER if not already
      if (target.role !== 'OWNER') {
        await tx.projectMember.update({
          where: {
            projectId_userId: { projectId, userId: newOwnerId },
          },
          data: { role: 'OWNER' },
        });
      }

      // Demote current owner if keepOwnership=false and there are multiple owners
      if (!keepOwnership) {
        const ownerCount = await tx.projectMember.count({
          where: { projectId, role: 'OWNER' },
        });

        if (ownerCount > 1) {
          await tx.projectMember.update({
            where: {
              projectId_userId: { projectId, userId: currentOwnerId },
            },
            data: { role: 'MANAGER' },
          });
          previousOwnerKeptOwnership = false;
        }
      }
    });

    // 4. Emit event (outside transaction - fire-and-forget)
    await this.eventBus.publish(
      new OwnershipTransferredEvent(
        projectId,
        newOwnerId,
        currentOwnerId,
        previousOwnerKeptOwnership
      )
    );
  }
}
