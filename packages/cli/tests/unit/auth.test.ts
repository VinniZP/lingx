import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialStore } from '../../src/lib/auth.js';

describe('CredentialStore', () => {
  let store: CredentialStore;

  beforeEach(() => {
    store = new CredentialStore({ configName: 'localeflow-test' });
  });

  afterEach(() => {
    store.clear();
  });

  it('should save and retrieve credentials', () => {
    store.saveCredentials('default', {
      apiUrl: 'http://localhost:3001',
      apiKey: 'lf_test_abc123',
      email: 'test@example.com',
    });

    const creds = store.getCredentials('default');
    expect(creds).toBeDefined();
    expect(creds?.apiKey).toBe('lf_test_abc123');
    expect(creds?.email).toBe('test@example.com');
    expect(creds?.apiUrl).toBe('http://localhost:3001');
  });

  it('should return null for non-existent profile', () => {
    const creds = store.getCredentials('nonexistent');
    expect(creds).toBeNull();
  });

  it('should delete credentials', () => {
    store.saveCredentials('default', {
      apiUrl: 'http://localhost:3001',
      apiKey: 'lf_test_abc123',
    });
    store.deleteCredentials('default');
    expect(store.getCredentials('default')).toBeNull();
  });

  it('should set and get default profile', () => {
    store.saveCredentials('prod', {
      apiUrl: 'https://api.example.com',
      apiKey: 'lf_prod_abc123',
    });
    store.setDefaultProfile('prod');
    expect(store.getDefaultProfile()).toBe('prod');
  });

  it('should list all profiles', () => {
    store.saveCredentials('dev', {
      apiUrl: 'http://localhost:3001',
      apiKey: 'lf_dev_123',
    });
    store.saveCredentials('prod', {
      apiUrl: 'https://api.example.com',
      apiKey: 'lf_prod_456',
    });

    const profiles = store.listProfiles();
    expect(profiles).toContain('dev');
    expect(profiles).toContain('prod');
    expect(profiles.length).toBe(2);
  });

  it('should use default profile when no profile specified', () => {
    store.saveCredentials('default', {
      apiUrl: 'http://localhost:3001',
      apiKey: 'lf_default_key',
    });

    const creds = store.getCredentials();
    expect(creds?.apiKey).toBe('lf_default_key');
  });

  it('should add createdAt timestamp when saving credentials', () => {
    store.saveCredentials('default', {
      apiUrl: 'http://localhost:3001',
      apiKey: 'lf_test_abc123',
    });

    const creds = store.getCredentials('default');
    expect(creds?.createdAt).toBeDefined();
    expect(new Date(creds!.createdAt!).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
