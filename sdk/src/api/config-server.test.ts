/**
 * Tests for Config Management Server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManagementServer } from './config-server.js';
import { InMemoryConfigStorage } from './config-storage.js';
import type { CreateTracepointRequest, CreateApiKeyRequest } from './config-types.js';

describe('ConfigManagementServer', () => {
  let server: ConfigManagementServer;
  let storage: InMemoryConfigStorage;

  beforeEach(() => {
    storage = new InMemoryConfigStorage();
    server = new ConfigManagementServer({
      storage,
      getCurrentUser: () => 'test-user',
      getClientId: () => '127.0.0.1',
    });
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Tracepoint CRUD Operations', () => {
    it('should create a tracepoint', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
        name: 'Main Entry',
        description: 'Trace main function entry',
        tags: ['important'],
      };

      const result = await server.createTracepoint('proj-1', 'dev', request);

      expect(result.id).toBeDefined();
      expect(result.projectId).toBe('proj-1');
      expect(result.environment).toBe('dev');
      expect(result.filePath).toBe('src/index.ts');
      expect(result.type).toBe('entry');
      expect(result.functionName).toBe('main');
      expect(result.enabled).toBe(true);
      expect(result.version).toBe(1);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should validate required fields on creation', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        // Missing functionName/functionPath
        code: '__trace__("entry")',
      };

      try {
        await server.createTracepoint('proj-1', 'dev', request);
        expect.fail('Should have thrown validation error');
      } catch (e) {
        expect((e as any).code).toBe('VALIDATION_ERROR');
      }
    });

    it('should retrieve a tracepoint by ID', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'test',
        code: '__trace__("test")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);
      const retrieved = await server.getTracepoint('proj-1', 'dev', created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.filePath).toBe(created.filePath);
    });

    it('should return 404 for missing tracepoint', async () => {
      try {
        await server.getTracepoint('proj-1', 'dev', 'nonexistent');
        expect.fail('Should have thrown not found error');
      } catch (e) {
        expect((e as any).code).toBe('NOT_FOUND');
      }
    });

    it('should list tracepoints', async () => {
      const req1: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
      };

      const req2: CreateTracepointRequest = {
        filePath: 'src/b.ts',
        type: 'exit',
        functionName: 'func2',
        code: '__trace__("2")',
      };

      await server.createTracepoint('proj-1', 'dev', req1);
      await server.createTracepoint('proj-1', 'dev', req2);

      const { tracepoints, total } = await server.listTracepoints('proj-1', 'dev');

      expect(total).toBe(2);
      expect(tracepoints.length).toBe(2);
    });

    it('should filter tracepoints by enabled status', async () => {
      const req1: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
        enabled: true,
      };

      const req2: CreateTracepointRequest = {
        filePath: 'src/b.ts',
        type: 'entry',
        functionName: 'func2',
        code: '__trace__("2")',
        enabled: false,
      };

      await server.createTracepoint('proj-1', 'dev', req1);
      await server.createTracepoint('proj-1', 'dev', req2);

      const { tracepoints, total } = await server.listTracepoints('proj-1', 'dev', { enabled: true });

      expect(total).toBe(1);
      expect(tracepoints[0].enabled).toBe(true);
    });

    it('should filter tracepoints by tags', async () => {
      const req1: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
        tags: ['critical', 'perf'],
      };

      const req2: CreateTracepointRequest = {
        filePath: 'src/b.ts',
        type: 'entry',
        functionName: 'func2',
        code: '__trace__("2")',
        tags: ['debug'],
      };

      await server.createTracepoint('proj-1', 'dev', req1);
      await server.createTracepoint('proj-1', 'dev', req2);

      const { tracepoints } = await server.listTracepoints('proj-1', 'dev', { tags: ['critical'] });

      expect(tracepoints.length).toBe(1);
      expect(tracepoints[0].tags).toContain('critical');
    });

    it('should update a tracepoint', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      const updated = await server.updateTracepoint('proj-1', 'dev', created.id, {
        name: 'Updated Name',
        enabled: false,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.enabled).toBe(false);
      expect(updated.version).toBe(2);
      expect(updated.previousVersionId).toBeDefined();
    });

    it('should update without creating version', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      const updated = await server.updateTracepoint(
        'proj-1',
        'dev',
        created.id,
        {
          name: 'Updated Name',
          createVersion: false,
        },
        undefined
      );

      expect(updated.version).toBe(1);
    });

    it('should delete a tracepoint', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      await server.deleteTracepoint('proj-1', 'dev', created.id);

      try {
        await server.getTracepoint('proj-1', 'dev', created.id);
        expect.fail('Should have thrown not found');
      } catch (e) {
        expect((e as any).code).toBe('NOT_FOUND');
      }
    });

    it('should enable/disable tracepoints', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
        enabled: true,
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      const disabled = await server.disableTracepoint('proj-1', 'dev', created.id);
      expect(disabled.enabled).toBe(false);

      const enabled = await server.enableTracepoint('proj-1', 'dev', created.id);
      expect(enabled.enabled).toBe(true);
    });
  });

  describe('Version Management', () => {
    it('should track version history', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("v1")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      await server.updateTracepoint('proj-1', 'dev', created.id, {
        code: '__trace__("v2")',
      });

      const history = await server.getVersionHistory('proj-1', 'dev', created.id);

      expect(history.length).toBeGreaterThan(0);
    });

    it('should rollback to previous version', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("v1")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      await server.updateTracepoint('proj-1', 'dev', created.id, {
        code: '__trace__("v2")',
      });

      const rolledBack = await server.rollbackVersion('proj-1', 'dev', created.id, '1');

      expect(rolledBack.code).toBe('__trace__("v1")');
    });
  });

  describe('API Key Management', () => {
    it('should create an API key', async () => {
      const request: CreateApiKeyRequest = {
        name: 'Integration Key',
        environments: ['dev', 'staging'],
        permissions: ['read', 'write'],
      };

      const key = await server.createApiKey('proj-1', request);

      expect(key.id).toBeDefined();
      expect(key.key).toMatch(/^sk_/);
      expect(key.projectId).toBe('proj-1');
      expect(key.name).toBe('Integration Key');
      expect(key.active).toBe(true);
    });

    it('should create API key with expiration', async () => {
      const request: CreateApiKeyRequest = {
        name: 'Temporary Key',
        environments: ['dev'],
        permissions: ['read'],
        expiresInDays: 7,
      };

      const key = await server.createApiKey('proj-1', request);

      expect(key.expiresAt).toBeDefined();
    });

    it('should list API keys', async () => {
      const req1: CreateApiKeyRequest = {
        name: 'Key 1',
        environments: ['dev'],
        permissions: ['read'],
      };

      const req2: CreateApiKeyRequest = {
        name: 'Key 2',
        environments: ['prod'],
        permissions: ['write'],
      };

      void (await server.createApiKey('proj-1', req1));
      void (await server.createApiKey('proj-1', req2));

      const keys = await server.listApiKeys('proj-1');

      expect(keys.length).toBe(2);
    });

    it('should revoke an API key', async () => {
      const request: CreateApiKeyRequest = {
        name: 'Test Key',
        environments: ['dev'],
        permissions: ['read'],
      };

      const key = await server.createApiKey('proj-1', request);

      await server.revokeApiKey('proj-1', key.id);

      const keys = await server.listApiKeys('proj-1');

      expect(keys.length).toBe(0);
    });
  });

  describe('Audit Logging', () => {
    it('should log tracepoint creation', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      const logs = await server.getResourceAuditLog('proj-1', 'tracepoint', created.id);

      expect(logs.length).toBeGreaterThan(0);
      const createLog = logs.find((l) => l.action === 'create');
      expect(createLog).toBeDefined();
      expect(createLog?.success).toBe(true);
    });

    it('should log tracepoint updates', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      await server.updateTracepoint('proj-1', 'dev', created.id, {
        name: 'Updated',
      });

      const logs = await server.getResourceAuditLog('proj-1', 'tracepoint', created.id);

      const updateLog = logs.find((l) => l.action === 'update');
      expect(updateLog).toBeDefined();
    });

    it('should log deletions', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', request);

      await server.deleteTracepoint('proj-1', 'dev', created.id);

      const logs = await server.getResourceAuditLog('proj-1', 'tracepoint', created.id);

      const deleteLog = logs.find((l) => l.action === 'delete');
      expect(deleteLog).toBeDefined();
    });

    it('should query audit logs', async () => {
      const request: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      await server.createTracepoint('proj-1', 'dev', request);

      const logs = await server.getAuditLog('proj-1', {
        resourceType: 'tracepoint',
        action: 'create',
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Import/Export', () => {
    it('should export configuration', async () => {
      const req1: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
      };

      const req2: CreateTracepointRequest = {
        filePath: 'src/b.ts',
        type: 'exit',
        functionName: 'func2',
        code: '__trace__("2")',
      };

      await server.createTracepoint('proj-1', 'dev', req1);
      await server.createTracepoint('proj-1', 'dev', req2);

      const exported = await server.exportConfig('proj-1', 'dev');

      expect(exported.version).toBe('1.0');
      expect(exported.projectId).toBe('proj-1');
      expect(exported.environment).toBe('dev');
      expect(exported.tracepoints.length).toBe(2);
      expect(exported.exportedAt).toBeDefined();
    });

    it('should import configuration', async () => {
      const req: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
      };

      void (await server.createTracepoint('proj-1', 'dev', req));
      const exported = await server.exportConfig('proj-1', 'dev');

      // Import into new project
      const result = await server.importConfig('proj-2', {
        data: {
          ...exported,
          projectId: 'proj-2',
        },
        strategy: 'merge',
      });

      expect(result.imported).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should skip existing tracepoints with skip strategy', async () => {
      const req: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
      };

      void (await server.createTracepoint('proj-1', 'dev', req));
      const exported = await server.exportConfig('proj-1', 'dev');

      const result = await server.importConfig('proj-1', {
        data: exported,
        strategy: 'skip',
      });

      expect(result.skipped).toBeGreaterThan(0);
    });

    it('should overwrite existing tracepoints with overwrite strategy', async () => {
      const req: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("original")',
      };

      const created = await server.createTracepoint('proj-1', 'dev', req);

      const exported = await server.exportConfig('proj-1', 'dev');
      exported.tracepoints[0].code = '__trace__("updated")';

      const result = await server.importConfig('proj-1', {
        data: exported,
        strategy: 'overwrite',
      });

      expect(result.imported).toBeGreaterThan(0);

      const updated = await server.getTracepoint('proj-1', 'dev', created.id);
      expect(updated.code).toBe('__trace__("updated")');
    });

    it('should add tags during import', async () => {
      const req: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
        tags: ['original'],
      };

      const created = await server.createTracepoint('proj-1', 'dev', req);
      const exported = await server.exportConfig('proj-1', 'dev');

      void (await server.importConfig('proj-2', {
        data: {
          ...exported,
          projectId: 'proj-2',
        },
        strategy: 'merge',
        additionalTags: ['imported'],
      }));

      const imported = await server.getTracepoint('proj-2', 'dev', created.id);
      expect(imported.tags).toContain('imported');
    });

    it('should enable all during import if requested', async () => {
      const req: CreateTracepointRequest = {
        filePath: 'src/a.ts',
        type: 'entry',
        functionName: 'func1',
        code: '__trace__("1")',
        enabled: false,
      };

      const created = await server.createTracepoint('proj-1', 'dev', req);
      const exported = await server.exportConfig('proj-1', 'dev');

      await server.importConfig('proj-2', {
        data: {
          ...exported,
          projectId: 'proj-2',
        },
        strategy: 'merge',
        enableAll: true,
      });

      const imported = await server.getTracepoint('proj-2', 'dev', created.id);
      expect(imported.enabled).toBe(true);
    });
  });

  describe('Environment Scoping', () => {
    it('should isolate tracepoints by environment', async () => {
      const req: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      const devTP = await server.createTracepoint('proj-1', 'dev', req);
      const prodTP = await server.createTracepoint('proj-1', 'prod', req);

      const devList = await server.listTracepoints('proj-1', 'dev');
      const prodList = await server.listTracepoints('proj-1', 'prod');

      expect(devList.total).toBe(1);
      expect(prodList.total).toBe(1);
      expect(devTP.id).not.toBe(prodTP.id);
    });
  });

  describe('Project Scoping', () => {
    it('should isolate tracepoints by project', async () => {
      const req: CreateTracepointRequest = {
        filePath: 'src/index.ts',
        type: 'entry',
        functionName: 'main',
        code: '__trace__("entry")',
      };

      await server.createTracepoint('proj-1', 'dev', req);
      await server.createTracepoint('proj-2', 'dev', req);

      const proj1List = await server.listTracepoints('proj-1', 'dev');
      const proj2List = await server.listTracepoints('proj-2', 'dev');

      expect(proj1List.total).toBe(1);
      expect(proj2List.total).toBe(1);
    });
  });
});
