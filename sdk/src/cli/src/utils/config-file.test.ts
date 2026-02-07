import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  loadConfig,
  saveConfig,
  configExists,
  findConfigFile,
  getConfigPath,
  createDefaultConfig,
  validateConfig,
  findConfigFilesByGlob,
} from './config-file.js';
import { TraceInjectionConfig } from '../../../index.js';

describe('Config File Management', () => {
  const testDir = path.join(process.cwd(), '.test-config-dir');
  const originalCwd = process.cwd();

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('findConfigFile', () => {
    it('finds JSON config file', async () => {
      const configPath = path.join(testDir, 'traceinject.config.json');
      const config = { tracepoints: [] };
      await fs.writeJSON(configPath, config);

      const result = findConfigFile();
      expect(result).toBe(configPath);
    });

    it('finds TypeScript config file', async () => {
      const configPath = path.join(testDir, 'traceinject.config.ts');
      const content = 'export default { tracepoints: [] };';
      await fs.writeFile(configPath, content);

      const result = findConfigFile();
      expect(result).toBe(configPath);
    });

    it('finds YAML config file', async () => {
      const configPath = path.join(testDir, 'traceinject.config.yaml');
      const content = 'tracepoints: []';
      await fs.writeFile(configPath, content);

      const result = findConfigFile();
      expect(result).toBe(configPath);
    });

    it('finds environment-specific config file', async () => {
      const configPath = path.join(
        testDir,
        'traceinject.config.production.json'
      );
      const config = { tracepoints: [] };
      await fs.writeJSON(configPath, config);

      const result = findConfigFile('production');
      expect(result).toBe(configPath);
    });

    it('prefers environment-specific config over default', async () => {
      const defaultPath = path.join(
        testDir,
        'traceinject.config.json'
      );
      const prodPath = path.join(
        testDir,
        'traceinject.config.production.json'
      );
      await fs.writeJSON(defaultPath, { tracepoints: [] });
      await fs.writeJSON(prodPath, { tracepoints: [] });

      const result = findConfigFile('production');
      expect(result).toBe(prodPath);
    });

    it('returns null when no config file exists', () => {
      const result = findConfigFile();
      expect(result).toBeNull();
    });

    it('prefers JSON over other formats', async () => {
      const jsonPath = path.join(testDir, 'traceinject.config.json');
      const tsPath = path.join(testDir, 'traceinject.config.ts');
      await fs.writeJSON(jsonPath, { tracepoints: [] });
      await fs.writeFile(tsPath, 'export default { tracepoints: [] };');

      const result = findConfigFile();
      expect(result).toBe(jsonPath);
    });
  });

  describe('loadConfig', () => {
    it('loads JSON config', async () => {
      const config: TraceInjectionConfig = {
        tracepoints: [],
        projectId: 'test-project',
      };
      const configPath = path.join(testDir, 'traceinject.config.json');
      await fs.writeJSON(configPath, config);

      const result = await loadConfig();
      expect(result).toEqual(config);
    });

    it('returns null when no config exists', async () => {
      const result = await loadConfig();
      expect(result).toBeNull();
    });

    it('loads config with environment override', async () => {
      const devConfig = { tracepoints: [], environment: 'development' };
      const prodConfig = { tracepoints: [], environment: 'production' };

      await fs.writeJSON(
        path.join(testDir, 'traceinject.config.json'),
        devConfig
      );
      await fs.writeJSON(
        path.join(testDir, 'traceinject.config.production.json'),
        prodConfig
      );

      const devResult = await loadConfig('development');
      const prodResult = await loadConfig('production');

      expect(devResult?.environment).toBe('development');
      expect(prodResult?.environment).toBe('production');
    });

    it('returns null on validation error', async () => {
      const invalidConfig = { tracepoints: 'not-an-array' };
      const configPath = path.join(testDir, 'traceinject.config.json');
      await fs.writeJSON(configPath, invalidConfig);

      const result = await loadConfig();
      expect(result).toBeNull();
    });

    it('handles malformed JSON gracefully', async () => {
      const configPath = path.join(testDir, 'traceinject.config.json');
      await fs.writeFile(configPath, '{ invalid json }');

      const result = await loadConfig();
      expect(result).toBeNull();
    });

    it('loads valid config with tracepoints', async () => {
      const config: TraceInjectionConfig = {
        tracepoints: [
          {
            id: 'tp-1',
            type: 'before',
            lineNumber: 10,
            captureExpressions: ['x', 'y'],
          },
        ],
        projectId: 'test-project',
        capture: {
          maxDepth: 5,
          maxArrayLength: 100,
          maxCaptureSize: 10240,
        },
      };
      const configPath = path.join(testDir, 'traceinject.config.json');
      await fs.writeJSON(configPath, config);

      const result = await loadConfig();
      expect(result).toEqual(config);
      expect(result?.tracepoints).toHaveLength(1);
    });
  });

  describe('saveConfig', () => {
    it('saves config to JSON file', async () => {
      const config: TraceInjectionConfig = {
        tracepoints: [],
        projectId: 'test-project',
      };

      await saveConfig(config);

      const saved = await fs.readJSON(
        path.join(testDir, 'traceinject.config.json')
      );
      expect(saved).toEqual(config);
    });

    it('saves config to custom path', async () => {
      const config: TraceInjectionConfig = {
        tracepoints: [],
        projectId: 'test-project',
      };
      const customPath = path.join(testDir, 'custom-config.json');

      await saveConfig(config, customPath);

      const saved = await fs.readJSON(customPath);
      expect(saved).toEqual(config);
    });

    it('throws error on invalid config', async () => {
      const invalidConfig = {
        tracepoints: 'not-an-array',
      } as unknown as TraceInjectionConfig;

      await expect(saveConfig(invalidConfig)).rejects.toThrow();
    });

    it('formats JSON with 2-space indentation', async () => {
      const config: TraceInjectionConfig = {
        tracepoints: [],
        projectId: 'test-project',
      };

      await saveConfig(config);

      const content = await fs.readFile(
        path.join(testDir, 'traceinject.config.json'),
        'utf-8'
      );
      expect(content).toContain('  "projectId"');
    });
  });

  describe('configExists', () => {
    it('returns true when config exists', async () => {
      const configPath = path.join(testDir, 'traceinject.config.json');
      await fs.writeJSON(configPath, { tracepoints: [] });

      const result = await configExists();
      expect(result).toBe(true);
    });

    it('returns false when config does not exist', async () => {
      const result = await configExists();
      expect(result).toBe(false);
    });

    it('checks for environment-specific config', async () => {
      const configPath = path.join(
        testDir,
        'traceinject.config.production.json'
      );
      await fs.writeJSON(configPath, { tracepoints: [] });

      const result = await configExists('production');
      expect(result).toBe(true);
    });
  });

  describe('getConfigPath', () => {
    it('returns config path when it exists', async () => {
      const configPath = path.join(testDir, 'traceinject.config.json');
      await fs.writeJSON(configPath, { tracepoints: [] });

      const result = getConfigPath();
      expect(result).toBe(configPath);
    });

    it('returns null when config does not exist', () => {
      const result = getConfigPath();
      expect(result).toBeNull();
    });

    it('returns environment-specific config path', async () => {
      const configPath = path.join(
        testDir,
        'traceinject.config.staging.json'
      );
      await fs.writeJSON(configPath, { tracepoints: [] });

      const result = getConfigPath('staging');
      expect(result).toBe(configPath);
    });
  });

  describe('createDefaultConfig', () => {
    it('creates default config with required fields', async () => {
      const config = await createDefaultConfig();

      expect(config.tracepoints).toEqual([]);
      expect(config.projectId).toBe('my-project');
      expect(config.environment).toBe('development');
    });

    it('creates default config with capture settings', async () => {
      const config = await createDefaultConfig();

      expect(config.capture?.maxDepth).toBe(5);
      expect(config.capture?.maxArrayLength).toBe(100);
      expect(config.capture?.maxCaptureSize).toBe(10240);
    });
  });

  describe('validateConfig', () => {
    it('validates correct config', () => {
      const config: TraceInjectionConfig = {
        tracepoints: [
          {
            id: 'tp-1',
            type: 'before',
            lineNumber: 10,
          },
        ],
      };

      const errors = validateConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('rejects empty config', () => {
      const config = null as unknown as TraceInjectionConfig;

      const errors = validateConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects config without tracepoints', () => {
      const config = { projectId: 'test' } as TraceInjectionConfig;

      const errors = validateConfig(config);
      expect(errors.some((e) => e.includes('tracepoints'))).toBe(true);
    });

    it('rejects config with non-array tracepoints', () => {
      const config = {
        tracepoints: 'not-an-array',
      } as unknown as TraceInjectionConfig;

      const errors = validateConfig(config);
      expect(errors.some((e) => e.includes('array'))).toBe(true);
    });

    it('validates multiple tracepoints', () => {
      const config: TraceInjectionConfig = {
        tracepoints: [
          {
            id: 'tp-1',
            type: 'before',
            lineNumber: 10,
          },
          {
            id: 'tp-2',
            type: 'after',
            functionName: 'myFunction',
          },
        ],
      };

      const errors = validateConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('detects missing tracepoint ID', () => {
      const config = {
        tracepoints: [
          {
            type: 'before',
            lineNumber: 10,
          },
        ],
      } as unknown as TraceInjectionConfig;

      const errors = validateConfig(config);
      expect(errors.some((e) => e.includes('id'))).toBe(true);
    });

    it('validates optional projectId field', () => {
      const config: TraceInjectionConfig = {
        tracepoints: [],
        projectId: 'my-project',
      };

      const errors = validateConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid projectId type', () => {
      const config = {
        tracepoints: [],
        projectId: 123,
      } as unknown as TraceInjectionConfig;

      const errors = validateConfig(config);
      expect(errors.some((e) => e.includes('projectId'))).toBe(true);
    });

    it('validates capture configuration', () => {
      const config: TraceInjectionConfig = {
        tracepoints: [],
        capture: {
          maxDepth: 5,
          maxArrayLength: 100,
          maxCaptureSize: 10240,
        },
      };

      const errors = validateConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid capture config values', () => {
      const config = {
        tracepoints: [],
        capture: {
          maxDepth: 'not-a-number',
        },
      } as unknown as TraceInjectionConfig;

      const errors = validateConfig(config);
      expect(errors.some((e) => e.includes('maxDepth'))).toBe(true);
    });
  });

  describe('findConfigFilesByGlob', () => {
    it('finds files matching simple glob pattern', async () => {
      const dir1 = path.join(testDir, 'config');
      await fs.ensureDir(dir1);
      const file1 = path.join(dir1, 'traceinject.config.json');
      const file2 = path.join(dir1, 'traceinject.config.prod.json');

      await fs.writeJSON(file1, { tracepoints: [] });
      await fs.writeJSON(file2, { tracepoints: [] });

      const results = await findConfigFilesByGlob('config/*.json');
      expect(results).toHaveLength(2);
      expect(results.some((r) => r.includes('traceinject.config.json'))).toBe(
        true
      );
    });

    it('finds files with recursive pattern', async () => {
      const dir1 = path.join(testDir, 'src');
      const dir2 = path.join(dir1, 'nested');
      await fs.ensureDir(dir2);

      const file1 = path.join(dir1, 'traceinject.config.json');
      const file2 = path.join(dir2, 'traceinject.config.json');

      await fs.writeJSON(file1, { tracepoints: [] });
      await fs.writeJSON(file2, { tracepoints: [] });

      const results = await findConfigFilesByGlob('**/traceinject.config.json');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('finds files matching specific extension pattern', async () => {
      const file1 = path.join(testDir, 'traceinject.config.json');
      const file2 = path.join(testDir, 'traceinject.config.yaml');
      const file3 = path.join(testDir, 'other.txt');

      await fs.writeJSON(file1, { tracepoints: [] });
      await fs.writeFile(file2, 'tracepoints: []');
      await fs.writeFile(file3, 'other content');

      const results = await findConfigFilesByGlob('traceinject.config.*');
      expect(results).toHaveLength(2);
    });

    it('returns empty array when no files match', async () => {
      const results = await findConfigFilesByGlob(
        'nonexistent/*.config.json'
      );
      expect(results).toHaveLength(0);
    });

    it('sorts results by modification time (newest first)', async () => {
      const file1 = path.join(testDir, 'config1.json');
      const file2 = path.join(testDir, 'config2.json');

      await fs.writeJSON(file1, { tracepoints: [] });
      // Wait a bit to ensure different mtime
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fs.writeJSON(file2, { tracepoints: [] });

      const results = await findConfigFilesByGlob('config*.json');
      // file2 should come first (it's newer)
      expect(results[0]).toContain('config2.json');
    });
  });

  describe('Integration tests', () => {
    it('complete config lifecycle: create, save, load, validate', async () => {
      // Create default config
      const config = await createDefaultConfig();

      // Save it
      await saveConfig(config);

      // Verify it exists
      expect(await configExists()).toBe(true);

      // Load it back
      const loaded = await loadConfig();
      expect(loaded).toEqual(config);

      // Get the path
      const configPath = getConfigPath();
      expect(configPath).not.toBeNull();

      // Validate it
      const errors = validateConfig(loaded!);
      expect(errors).toHaveLength(0);
    });

    it('handles environment-specific config loading', async () => {
      const devConfig: TraceInjectionConfig = {
        tracepoints: [],
        environment: 'development',
        projectId: 'dev-project',
      };

      const prodConfig: TraceInjectionConfig = {
        tracepoints: [],
        environment: 'production',
        projectId: 'prod-project',
      };

      // Save both configs
      await fs.writeJSON(
        path.join(testDir, 'traceinject.config.json'),
        devConfig
      );
      await fs.writeJSON(
        path.join(testDir, 'traceinject.config.production.json'),
        prodConfig
      );

      // Load with different environments
      const dev = await loadConfig('development');
      const prod = await loadConfig('production');

      expect(dev?.projectId).toBe('dev-project');
      expect(prod?.projectId).toBe('prod-project');
    });
  });
});
