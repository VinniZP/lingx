/**
 * WebAuthn Service
 *
 * Handles Passkey/WebAuthn registration and authentication.
 * Uses SimpleWebAuthn for cryptographic operations.
 */
import { PrismaClient } from '@prisma/client';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../plugins/error-handler.js';

/** Minimum passkeys required for passwordless */
const MIN_PASSKEYS_FOR_PASSWORDLESS = 2;

export interface WebAuthnCredential {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
}

export interface WebAuthnStatus {
  hasPasskeys: boolean;
  credentialsCount: number;
  canGoPasswordless: boolean;
  isPasswordless: boolean;
}

export class WebAuthnService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // CONFIGURATION
  // ============================================

  private get rpId(): string {
    const rpId = process.env.WEBAUTHN_RP_ID;
    if (!rpId) {
      throw new Error('WEBAUTHN_RP_ID environment variable is required');
    }
    return rpId;
  }

  private get rpName(): string {
    return process.env.WEBAUTHN_RP_NAME || 'Lingx';
  }

  private get origin(): string {
    const origin = process.env.WEBAUTHN_ORIGIN;
    if (!origin) {
      throw new Error('WEBAUTHN_ORIGIN environment variable is required');
    }
    return origin;
  }

  // ============================================
  // REGISTRATION
  // ============================================

  /**
   * Generate registration options for creating a new passkey
   */
  async generateRegistrationOptions(
    userId: string,
    jwt: { sign: (payload: object, options?: { expiresIn?: string }) => string }
  ): Promise<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        webauthnCredentials: {
          select: { credentialId: true, transports: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Get existing credentials to exclude
    const excludeCredentials = user.webauthnCredentials.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: user.email,
      userDisplayName: user.name || user.email,
      // Use user.id as Uint8Array
      userID: new TextEncoder().encode(user.id),
      // Don't allow re-registering the same authenticator
      excludeCredentials,
      // Prefer resident keys (discoverable credentials) for better UX
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Create challenge token containing the challenge
    const challengeToken = jwt.sign(
      { challenge: options.challenge, userId, purpose: 'webauthn-register' },
      { expiresIn: '5m' }
    );

    return { options, challengeToken };
  }

  /**
   * Verify registration response and store the new credential
   */
  async verifyRegistration(
    userId: string,
    name: string,
    challengeToken: string,
    response: RegistrationResponseJSON,
    jwt: { verify: <T>(token: string) => T }
  ): Promise<WebAuthnCredential> {
    // Verify and decode the challenge token
    let payload: { challenge: string; userId: string; purpose: string };
    try {
      payload = jwt.verify(challengeToken);
    } catch {
      throw new BadRequestError('Invalid or expired challenge token');
    }

    if (payload.purpose !== 'webauthn-register' || payload.userId !== userId) {
      throw new BadRequestError('Invalid challenge token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify the registration response
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: payload.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
      });
    } catch (error) {
      throw new BadRequestError(
        `Registration verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestError('Registration verification failed');
    }

    const { registrationInfo } = verification;

    // Store the credential
    const credential = await this.prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: registrationInfo.credential.id,
        publicKey: Buffer.from(registrationInfo.credential.publicKey).toString('base64'),
        counter: BigInt(registrationInfo.credential.counter),
        transports: (response.response.transports || []) as string[],
        deviceType: registrationInfo.credentialDeviceType,
        backedUp: registrationInfo.credentialBackedUp,
        aaguid: registrationInfo.aaguid,
        name,
      },
    });

    return {
      id: credential.id,
      name: credential.name,
      createdAt: credential.createdAt.toISOString(),
      lastUsedAt: null,
      deviceType: credential.deviceType as 'singleDevice' | 'multiDevice',
      backedUp: credential.backedUp,
    };
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Generate authentication options for signing in with a passkey
   */
  async generateAuthenticationOptions(
    email: string | undefined,
    jwt: { sign: (payload: object, options?: { expiresIn?: string }) => string }
  ): Promise<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challengeToken: string;
  }> {
    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;
    let userId: string | undefined;

    // If email is provided, get user's credentials
    if (email) {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          webauthnCredentials: {
            select: { credentialId: true, transports: true },
          },
        },
      });

      if (user && user.webauthnCredentials.length > 0) {
        userId = user.id;
        allowCredentials = user.webauthnCredentials.map((cred) => ({
          id: cred.credentialId,
          transports: cred.transports as AuthenticatorTransportFuture[],
        }));
      }
    }

    // Generate options (allowCredentials undefined = discoverable credential flow)
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Create challenge token
    const challengeToken = jwt.sign(
      { challenge: options.challenge, userId, purpose: 'webauthn-auth' },
      { expiresIn: '5m' }
    );

    return { options, challengeToken };
  }

  /**
   * Verify authentication response and return authenticated user
   */
  async verifyAuthentication(
    challengeToken: string,
    response: AuthenticationResponseJSON,
    jwt: { verify: <T>(token: string) => T }
  ): Promise<{ userId: string; credentialId: string }> {
    // Verify and decode the challenge token
    let payload: { challenge: string; userId?: string; purpose: string };
    try {
      payload = jwt.verify(challengeToken);
    } catch {
      throw new BadRequestError('Invalid or expired challenge token');
    }

    if (payload.purpose !== 'webauthn-auth') {
      throw new BadRequestError('Invalid challenge token');
    }

    // Find the credential by credentialId from the response
    const credential = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId: response.id },
      include: { user: true },
    });

    if (!credential) {
      throw new UnauthorizedError('Passkey not found');
    }

    // Verify the authentication response
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: payload.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: Number(credential.counter),
          transports: credential.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (error) {
      throw new UnauthorizedError(
        `Authentication verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (!verification.verified) {
      throw new UnauthorizedError('Authentication verification failed');
    }

    // Update the counter and last used timestamp
    await this.prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    return {
      userId: credential.userId,
      credentialId: credential.id,
    };
  }

  // ============================================
  // CREDENTIAL MANAGEMENT
  // ============================================

  /**
   * List all passkeys for a user
   */
  async listCredentials(userId: string): Promise<WebAuthnCredential[]> {
    const credentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return credentials.map((cred) => ({
      id: cred.id,
      name: cred.name,
      createdAt: cred.createdAt.toISOString(),
      lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
      deviceType: cred.deviceType as 'singleDevice' | 'multiDevice',
      backedUp: cred.backedUp,
    }));
  }

  /**
   * Delete a passkey
   */
  async deleteCredential(
    userId: string,
    credentialId: string
  ): Promise<{ remainingCount: number }> {
    const credential = await this.prisma.webAuthnCredential.findFirst({
      where: { id: credentialId, userId },
    });

    if (!credential) {
      throw new NotFoundError('Passkey not found');
    }

    // Check if user is passwordless and this is their last passkey
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    const credentialCount = await this.prisma.webAuthnCredential.count({
      where: { userId },
    });

    if (!user?.password && credentialCount <= 1) {
      throw new BadRequestError(
        'Cannot delete your only passkey. You must add a password or another passkey first.'
      );
    }

    await this.prisma.webAuthnCredential.delete({
      where: { id: credentialId },
    });

    return { remainingCount: credentialCount - 1 };
  }

  /**
   * Get WebAuthn status for a user
   */
  async getStatus(userId: string): Promise<WebAuthnStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const credentialsCount = await this.prisma.webAuthnCredential.count({
      where: { userId },
    });

    return {
      hasPasskeys: credentialsCount > 0,
      credentialsCount,
      canGoPasswordless: credentialsCount >= MIN_PASSKEYS_FOR_PASSWORDLESS,
      isPasswordless: user.password === null,
    };
  }

  // ============================================
  // PASSWORDLESS
  // ============================================

  /**
   * Remove password and go fully passwordless
   * Requires at least 2 passkeys for safety
   */
  async goPasswordless(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.password === null) {
      throw new BadRequestError('You are already passwordless');
    }

    const credentialsCount = await this.prisma.webAuthnCredential.count({
      where: { userId },
    });

    if (credentialsCount < MIN_PASSKEYS_FOR_PASSWORDLESS) {
      throw new BadRequestError(
        `You need at least ${MIN_PASSKEYS_FOR_PASSWORDLESS} passkeys to go passwordless. ` +
        `You currently have ${credentialsCount}.`
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: null,
        passwordlessAt: new Date(),
      },
    });
  }

  /**
   * Check if a user is passwordless (for login flow)
   */
  async isPasswordless(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    return user?.password === null;
  }

  /**
   * Check if user has any passkeys (for login flow hint)
   */
  async hasPasskeys(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return false;
    }

    const count = await this.prisma.webAuthnCredential.count({
      where: { userId: user.id },
    });

    return count > 0;
  }
}
