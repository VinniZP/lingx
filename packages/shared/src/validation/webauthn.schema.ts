import { z } from 'zod';

// ============================================
// REGISTRATION SCHEMAS
// ============================================

/**
 * Response from POST /api/webauthn/register/options
 */
export const webauthnRegisterOptionsResponseSchema = z.object({
  options: z.any(), // PublicKeyCredentialCreationOptionsJSON from @simplewebauthn
  challengeToken: z.string(), // JWT containing challenge for verification
});

export type WebAuthnRegisterOptionsResponse = z.infer<typeof webauthnRegisterOptionsResponseSchema>;

/**
 * Request body for POST /api/webauthn/register/verify
 */
export const webauthnRegisterVerifySchema = z.object({
  name: z.string().min(1, 'Passkey name is required').max(100, 'Passkey name too long'),
  challengeToken: z.string(),
  response: z.any(), // RegistrationResponseJSON from browser
});

export type WebAuthnRegisterVerifyInput = z.infer<typeof webauthnRegisterVerifySchema>;

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

/**
 * Request body for POST /api/webauthn/authenticate/options
 */
export const webauthnAuthOptionsSchema = z.object({
  email: z.string().email().optional(), // Optional for discoverable credentials
});

export type WebAuthnAuthOptionsInput = z.infer<typeof webauthnAuthOptionsSchema>;

/**
 * Response from POST /api/webauthn/authenticate/options
 */
export const webauthnAuthOptionsResponseSchema = z.object({
  options: z.any(), // PublicKeyCredentialRequestOptionsJSON from @simplewebauthn
  challengeToken: z.string(), // JWT containing challenge for verification
});

export type WebAuthnAuthOptionsResponse = z.infer<typeof webauthnAuthOptionsResponseSchema>;

/**
 * Request body for POST /api/webauthn/authenticate/verify
 */
export const webauthnAuthVerifySchema = z.object({
  challengeToken: z.string(),
  response: z.any(), // AuthenticationResponseJSON from browser
});

export type WebAuthnAuthVerifyInput = z.infer<typeof webauthnAuthVerifySchema>;

// ============================================
// CREDENTIAL MANAGEMENT SCHEMAS
// ============================================

/**
 * Single passkey credential for display
 */
export const webauthnCredentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  deviceType: z.enum(['singleDevice', 'multiDevice']),
  backedUp: z.boolean(),
});

export type WebAuthnCredential = z.infer<typeof webauthnCredentialSchema>;

/**
 * Response from GET /api/webauthn/credentials
 */
export const webauthnCredentialsResponseSchema = z.object({
  credentials: z.array(webauthnCredentialSchema),
});

export type WebAuthnCredentialsResponse = z.infer<typeof webauthnCredentialsResponseSchema>;

/**
 * Response from GET /api/webauthn/status
 */
export const webauthnStatusResponseSchema = z.object({
  hasPasskeys: z.boolean(),
  credentialsCount: z.number(),
  canGoPasswordless: z.boolean(), // true if 2+ passkeys
  isPasswordless: z.boolean(), // true if user has no password set
});

export type WebAuthnStatusResponse = z.infer<typeof webauthnStatusResponseSchema>;

/**
 * Response from DELETE /api/webauthn/credentials/:id
 */
export const webauthnDeleteCredentialResponseSchema = z.object({
  message: z.string(),
  remainingCount: z.number(),
});

export type WebAuthnDeleteCredentialResponse = z.infer<typeof webauthnDeleteCredentialResponseSchema>;

/**
 * Response from POST /api/webauthn/go-passwordless
 */
export const webauthnGoPasswordlessResponseSchema = z.object({
  message: z.string(),
});

export type WebAuthnGoPasswordlessResponse = z.infer<typeof webauthnGoPasswordlessResponseSchema>;
