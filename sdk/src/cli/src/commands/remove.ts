import { Command } from 'commander';
import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../utils/config-file.js';
import {
  logSuccess,
  logError,
  logInfo,
  logSection,
} from '../utils/output.js';

export const removeCommand = new Command('remove')
  .description('Remove a tracepoint')
  .argument('[id]', 'Tracepoint ID to remove')
  .action(async (id?: string) => {
    try {
      const config = await loadConfig();

      if (!config) {
        logError('No traceinject.config.json found in current directory');
        logInfo('Run "trace-inject init" to create one');
        process.exit(1);
      }

      if (!config.tracepoints || config.tracepoints.length === 0) {
        logError('No tracepoints configured');
        process.exit(1);
      }

      let targetId = id;

      if (!targetId) {
        logSection('Remove Tracepoint');

        const { selectedId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedId',
            message: 'Select tracepoint to remove:',
            choices: config.tracepoints.map((tp) => ({
              name: `${tp.id} (${tp.type})`,
              value: tp.id,
            })),
          },
        ]);

        targetId = selectedId;
      }

      const originalLength = config.tracepoints.length;
      config.tracepoints = config.tracepoints.filter((tp) => tp.id !== targetId);

      if (config.tracepoints.length === originalLength) {
        logError(`Tracepoint "${targetId}" not found`);
        process.exit(1);
      }

      await saveConfig(config);
      logSuccess(`Tracepoint "${targetId}" removed`);
    } catch (error) {
      logError(
        `Failed to remove tracepoint: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });
