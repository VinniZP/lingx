-- Add partial unique index for pending invitations
-- This enforces uniqueness at the database level while allowing re-invitations
-- after revocation/acceptance. Only one pending invitation per email per project.
CREATE UNIQUE INDEX "ProjectInvitation_projectId_email_pending_key"
ON "ProjectInvitation"("projectId", "email")
WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;
