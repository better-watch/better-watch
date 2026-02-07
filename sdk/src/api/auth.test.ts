/**
 * Tests for authentication module
 */

import { describe, it, expect } from 'vitest';
import { Authenticator } from './auth.js';

describe('Authenticator', () => {
  it('should authenticate with valid API key and project ID', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    const result = await auth.authenticate('test-key', 'project-1');

    expect(result).toBe(true);
  });

  it('should reject invalid API key', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    const result = await auth.authenticate('invalid-key', 'project-1');

    expect(result).toBe(false);
  });

  it('should reject mismatched project ID', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    const result = await auth.authenticate('test-key', 'project-2');

    expect(result).toBe(false);
  });

  it('should reject empty API key', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    const result = await auth.authenticate('', 'project-1');

    expect(result).toBe(false);
  });

  it('should reject empty project ID', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    const result = await auth.authenticate('test-key', '');

    expect(result).toBe(false);
  });

  it('should support custom validator', async () => {
    const auth = new Authenticator({
      validate: async (apiKey, projectId) => {
        return apiKey === 'custom-key' && projectId === 'custom-project';
      },
    });

    const result1 = await auth.authenticate('custom-key', 'custom-project');
    const result2 = await auth.authenticate('wrong-key', 'custom-project');

    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it('should prefer custom validator over API keys', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
      validate: async () => false,
    });

    const result = await auth.authenticate('test-key', 'project-1');

    expect(result).toBe(false);
  });

  it('should handle validator errors gracefully', async () => {
    const auth = new Authenticator({
      validate: async () => {
        throw new Error('Validation error');
      },
    });

    const result = await auth.authenticate('test-key', 'project-1');

    expect(result).toBe(false);
  });

  it('should add new API keys', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    auth.addApiKey('new-key', 'new-project');
    const result = await auth.authenticate('new-key', 'new-project');

    expect(result).toBe(true);
  });

  it('should remove API keys', async () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    auth.removeApiKey('test-key');
    const result = await auth.authenticate('test-key', 'project-1');

    expect(result).toBe(false);
  });

  it('should check if API key exists', () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    expect(auth.hasApiKey('test-key')).toBe(true);
    expect(auth.hasApiKey('invalid-key')).toBe(false);
  });

  it('should get project ID for API key', () => {
    const auth = new Authenticator({
      apiKeys: {
        'test-key': 'project-1',
      },
    });

    expect(auth.getProjectId('test-key')).toBe('project-1');
    expect(auth.getProjectId('invalid-key')).toBeUndefined();
  });
});
