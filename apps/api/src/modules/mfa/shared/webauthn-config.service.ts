/**
 * WebAuthn Config Service
 *
 * Provides WebAuthn configuration from environment variables.
 */

export class WebAuthnConfigService {
  /**
   * Relying Party ID (domain without protocol)
   * e.g., "example.com"
   */
  get rpId(): string {
    const rpId = process.env.WEBAUTHN_RP_ID;
    if (!rpId) {
      throw new Error('WEBAUTHN_RP_ID environment variable is required');
    }
    return rpId;
  }

  /**
   * Relying Party Name (displayed in authenticator apps)
   * e.g., "Lingx"
   */
  get rpName(): string {
    return process.env.WEBAUTHN_RP_NAME || 'Lingx';
  }

  /**
   * Expected origin for WebAuthn operations
   * e.g., "https://example.com"
   */
  get origin(): string {
    const origin = process.env.WEBAUTHN_ORIGIN;
    if (!origin) {
      throw new Error('WEBAUTHN_ORIGIN environment variable is required');
    }
    return origin;
  }
}
