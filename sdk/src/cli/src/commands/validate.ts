import { Command } from 'commander';
import {
  loadConfig,
  validateConfig,
  getConfigPath,
} from '../utils/config-file.js';
import {
  logSuccess,
  logError,
  logInfo,
  logSection,
  displayValidationErrors,
} from '../utils/output.js';

export const validateCommand = new Command('validate')
  .description('Validate the trace-inject configuration')
  .action(async () => {
    try {
      const config = await loadConfig();

      if (!config) {
        logError('No traceinject.config.json found in current directory');
        logInfo('Run "trace-inject init" to create one');
        process.exit(1);
      }

      const errors = validateConfig(config);

      logSection('Configuration Validation');
      logInfo(`Config file: ${getConfigPath()}`);
      logInfo(`Tracepoints: ${config.tracepoints?.length || 0}`);

      if (errors.length === 0) {
        logSuccess('Configuration is valid');
        process.exit(0);
      } else {
        displayValidationErrors(errors);
        process.exit(1);
      }
    } catch (error) {
      logError(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });
