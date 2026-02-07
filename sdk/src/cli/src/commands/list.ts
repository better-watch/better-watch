import { Command } from 'commander';
import { loadConfig, getConfigPath } from '../utils/config-file.js';
import {
  logError,
  logInfo,
  logSection,
  displayTracepoints,
} from '../utils/output.js';

export const listCommand = new Command('list')
  .description('List all configured tracepoints')
  .option('-f, --file <path>', 'Config file path (defaults to traceinject.config.json)')
  .action(async () => {
    try {
      const config = await loadConfig();

      if (!config) {
        logError('No traceinject.config.json found in current directory');
        logInfo('Run "trace-inject init" to create one');
        process.exit(1);
      }

      logSection('Configured Tracepoints');
      logInfo(`Config file: ${getConfigPath()}`);
      logInfo(`Project: ${config.projectId || 'unknown'}`);
      logInfo(`Environment: ${config.environment || 'unknown'}\n`);

      if (config.tracepoints && config.tracepoints.length > 0) {
        displayTracepoints(config.tracepoints);
      } else {
        logInfo('No tracepoints configured');
      }

      console.log();
    } catch (error) {
      logError(
        `Failed to list tracepoints: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });
