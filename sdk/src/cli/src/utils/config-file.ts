import * as fs from 'fs-extra';
import * as path from 'path';
import {
  TraceInjectionConfig,
  defineConfig,
  validateTracepointDefinition,
} from '../../../index.js';

// Supported config file extensions in priority order
const CONFIG_FORMATS = ['json', 'ts', 'yaml', 'yml'] as const;
type ConfigFormat = typeof CONFIG_FORMATS[number];

const CONFIG_DIR = process.cwd();

/**
 * Finds the appropriate config file with optional environment-specific fallback
 * Checks in order: production.json, production.ts, production.yaml, etc.
 * Then falls back to: traceinject.config.json, traceinject.config.ts, etc.
 */
export function findConfigFile(environment?: string): string | null {
  const candidates: string[] = [];

  // First, try environment-specific configs if environment is provided
  if (environment) {
    for (const format of CONFIG_FORMATS) {
      candidates.push(
        path.join(CONFIG_DIR, `traceinject.config.${environment}.${format}`)
      );
    }
  }

  // Then try standard config filenames
  for (const format of CONFIG_FORMATS) {
    candidates.push(path.join(CONFIG_DIR, `traceinject.config.${format}`));
  }

  // Return the first file that exists
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Simple glob pattern matcher for finding files.
 * Converts glob patterns to regex patterns.
 */
function globPatternToRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexPattern}$`);
}

/**
 * Finds config files matching a glob pattern.
 * Supports recursive patterns and wildcards.
 * @param pattern Glob pattern to match
 * @param cwd Working directory for glob search (defaults to current directory)
 * @returns Array of matching file paths sorted by modification time (newest first)
 */
export async function findConfigFilesByGlob(
  pattern: string,
  cwd: string = CONFIG_DIR
): Promise<string[]> {
  try {
    const regex = globPatternToRegex(pattern);
    const files: Array<{ file: string; mtime: number }> = [];

    // Recursively search directories
    // eslint-disable-next-line no-inner-declarations
    async function searchDir(dir: string, basePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(basePath, entry.name);

          if (entry.isDirectory()) {
            // Recursively search subdirectories
            await searchDir(fullPath, relativePath);
          } else if (entry.isFile()) {
            // Check if file matches pattern
            if (regex.test(relativePath)) {
              const stat = await fs.stat(fullPath);
              files.push({
                file: fullPath,
                mtime: stat.mtime.getTime(),
              });
            }
          }
        }
      } catch (error) {
        // Silently skip directories we can't read
      }
    }

    await searchDir(cwd);

    // Sort by modification time (newest first)
    files.sort((a, b) => b.mtime - a.mtime);

    return files.map((item) => item.file);
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to search for config files with pattern "${pattern}": ${errMsg}`
    );
  }
}

/**
 * Loads JSON configuration file
 */
async function loadJsonConfig(filePath: string): Promise<TraceInjectionConfig> {
  const content = await fs.readFile(filePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse JSON config at ${filePath}: ${errMsg}`
    );
  }
}

/**
 * Loads YAML configuration file.
 * Note: This requires the 'yaml' package to be installed.
 */
async function loadYamlConfig(filePath: string): Promise<TraceInjectionConfig> {
  try {
    // Dynamically import yaml to avoid requiring it if not used
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const yamlModule = await import('yaml' as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yaml = yamlModule as any;
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = yaml.parse(content) as TraceInjectionConfig;
    return parsed;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Cannot find module')
    ) {
      throw new Error(
        `YAML config requires 'yaml' package to be installed. Install with: npm install yaml`
      );
    }
    const errMsg =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse YAML config at ${filePath}: ${errMsg}`
    );
  }
}

/**
 * Loads TypeScript configuration file
 * The config file should export a default export with the configuration object
 */
async function loadTsConfig(filePath: string): Promise<TraceInjectionConfig> {
  try {
    const absolutePath = path.resolve(filePath);

    // Use dynamic import with file:// protocol
    // This works with --experimental-vm-modules or tsx/ts-node loaders
    const fileUrl = new URL(`file://${absolutePath}`).href;
    const module = await import(fileUrl);

    // Support both default export and named export
    const config = module.default !== undefined ? module.default : module.config;

    if (!config) {
      throw new Error(
        'TypeScript config file must export a default export or named "config" export. ' +
        'Example: export default { tracepoints: [...] } or export const config = { tracepoints: [...] }'
      );
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      // Provide helpful error message for common issues
      if (error.message.includes('Cannot find module')) {
        throw new Error(
          `Failed to load TypeScript config at ${filePath}. ` +
          'TypeScript files require a loader like tsx or ts-node. ' +
          'Install with: npm install --save-dev tsx'
        );
      }
      if (error.message.includes('ERR_MODULE_NOT_FOUND')) {
        throw new Error(
          `TypeScript config file not found: ${filePath}`
        );
      }
      throw error;
    }
    throw new Error(
      `Failed to load TypeScript config at ${filePath}: ${String(error)}`
    );
  }
}

/**
 * Determines the config format by file extension
 */
function getConfigFormat(filePath: string): ConfigFormat {
  const ext = path.extname(filePath).toLowerCase().slice(1);

  if (ext === 'yaml' || ext === 'yml') {
    return 'yaml';
  }

  if (ext === 'ts') {
    return 'ts';
  }

  if (ext === 'json') {
    return 'json';
  }

  // Default to JSON if unknown
  return 'json';
}

/**
 * Validates that a configuration matches the schema
 * Provides detailed error messages for troubleshooting
 */
export function validateConfig(config: TraceInjectionConfig): string[] {
  const errors: string[] = [];

  if (!config) {
    errors.push('Configuration must not be empty');
    return errors;
  }

  if (!config.tracepoints) {
    errors.push('Config must have a "tracepoints" array');
    return errors;
  }

  if (!Array.isArray(config.tracepoints)) {
    errors.push('Config property "tracepoints" must be an array');
    return errors;
  }

  if (config.tracepoints.length === 0) {
    errors.push(
      'Config has an empty "tracepoints" array. Add at least one tracepoint definition.'
    );
  }

  config.tracepoints.forEach((tp, index) => {
    if (!tp.id) {
      errors.push(
        `Tracepoint at index ${index}: missing required field "id"`
      );
      return;
    }

    const tpErrors = validateTracepointDefinition(tp);
    if (tpErrors.length > 0) {
      errors.push(
        `Tracepoint "${tp.id}" (index ${index}): ${tpErrors.join('; ')}`
      );
    }
  });

  // Validate other optional fields
  if (config.projectId && typeof config.projectId !== 'string') {
    errors.push('Config property "projectId" must be a string');
  }

  if (config.environment && typeof config.environment !== 'string') {
    errors.push('Config property "environment" must be a string');
  }

  if (config.capture) {
    if (
      config.capture.maxDepth !== undefined &&
      typeof config.capture.maxDepth !== 'number'
    ) {
      errors.push('Config property "capture.maxDepth" must be a number');
    }
    if (
      config.capture.maxArrayLength !== undefined &&
      typeof config.capture.maxArrayLength !== 'number'
    ) {
      errors.push('Config property "capture.maxArrayLength" must be a number');
    }
    if (
      config.capture.maxCaptureSize !== undefined &&
      typeof config.capture.maxCaptureSize !== 'number'
    ) {
      errors.push('Config property "capture.maxCaptureSize" must be a number');
    }
  }

  return errors;
}

/**
 * Loads configuration from file, supporting JSON, TypeScript, and YAML formats
 * Automatically detects environment-specific config files
 * @param environment Optional environment name for environment-specific config
 * @returns Loaded configuration or null if no config file found
 */
export async function loadConfig(
  environment?: string
): Promise<TraceInjectionConfig | null> {
  const configPath = findConfigFile(environment);

  if (!configPath) {
    return null;
  }

  try {
    const format = getConfigFormat(configPath);

    let config: TraceInjectionConfig;

    switch (format) {
      case 'yaml':
      case 'yml':
        config = await loadYamlConfig(configPath);
        break;
      case 'ts':
        config = await loadTsConfig(configPath);
        break;
      case 'json':
      default:
        config = await loadJsonConfig(configPath);
        break;
    }

    // Validate the loaded configuration
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      console.error(
        `Configuration validation errors in ${configPath}:`
      );
      validationErrors.forEach((err) => console.error(`  - ${err}`));
      return null;
    }

    return config;
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : String(error);
    console.error(`Failed to load config from ${configPath}: ${errMsg}`);
    return null;
  }
}

/**
 * Saves configuration to file in JSON format
 * @param config Configuration to save
 * @param filePath Optional path; defaults to traceinject.config.json
 */
export async function saveConfig(
  config: TraceInjectionConfig,
  filePath?: string
): Promise<void> {
  const savePath = filePath || path.join(CONFIG_DIR, 'traceinject.config.json');

  // Validate before saving
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(
      `Cannot save invalid config. Validation errors:\n${errors.join('\n')}`
    );
  }

  try {
    await fs.writeFile(savePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save config to ${savePath}: ${errMsg}`);
  }
}

/**
 * Checks if a configuration file exists
 * Checks for any supported format with optional environment-specific fallback
 */
export async function configExists(environment?: string): Promise<boolean> {
  return findConfigFile(environment) !== null;
}

/**
 * Gets the path to the first found config file
 * Returns null if no config file exists
 */
export function getConfigPath(environment?: string): string | null {
  return findConfigFile(environment);
}

/**
 * Creates a default configuration
 */
export async function createDefaultConfig(): Promise<TraceInjectionConfig> {
  return defineConfig({
    tracepoints: [],
    projectId: 'my-project',
    environment: 'development',
    capture: {
      maxDepth: 5,
      maxArrayLength: 100,
      maxCaptureSize: 10240,
    },
  });
}
