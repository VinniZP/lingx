import Conf from 'conf';

export interface Credentials {
  apiUrl: string;
  apiKey: string;
  userId?: string;
  email?: string;
  createdAt?: string;
}

interface CredentialsSchema {
  version: number;
  profiles: Record<string, Credentials>;
  defaultProfile: string;
}

export class CredentialStore {
  private conf: Conf<CredentialsSchema>;

  constructor(options?: { configName?: string }) {
    this.conf = new Conf<CredentialsSchema>({
      projectName: 'lingx',
      configName: options?.configName ?? 'credentials',
      defaults: {
        version: 1,
        profiles: {},
        defaultProfile: 'default',
      },
    });
  }

  saveCredentials(profile: string, credentials: Credentials): void {
    const profiles = this.conf.get('profiles') || {};
    profiles[profile] = {
      ...credentials,
      createdAt: credentials.createdAt ?? new Date().toISOString(),
    };
    this.conf.set('profiles', profiles);
  }

  getCredentials(profile?: string): Credentials | null {
    const profileName = profile ?? this.conf.get('defaultProfile');
    const profiles = this.conf.get('profiles') || {};
    return profiles[profileName] ?? null;
  }

  deleteCredentials(profile?: string): void {
    const profileName = profile ?? this.conf.get('defaultProfile');
    const profiles = this.conf.get('profiles') || {};
    delete profiles[profileName];
    this.conf.set('profiles', profiles);
  }

  setDefaultProfile(profile: string): void {
    this.conf.set('defaultProfile', profile);
  }

  getDefaultProfile(): string {
    return this.conf.get('defaultProfile');
  }

  listProfiles(): string[] {
    const profiles = this.conf.get('profiles') || {};
    return Object.keys(profiles);
  }

  clear(): void {
    this.conf.clear();
  }
}

// Singleton instance
export const credentialStore = new CredentialStore();
