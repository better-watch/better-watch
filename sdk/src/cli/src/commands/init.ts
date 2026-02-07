import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  configExists,
  createDefaultConfig,
  saveConfig,
} from '../utils/config-file.js';
import { logSuccess, logError, logInfo, logWarning } from '../utils/output.js';

export const initCommand = new Command('init')
  .description('Initialize a trace-inject configuration file')
  .action(async () => {
    try {
      if (await configExists()) {
        logWarning('traceinject.config.json already exists');

        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Do you want to overwrite it?',
            default: false,
          },
        ]);

        if (!overwrite) {
          logInfo('Init cancelled');
          return;
        }
      }

      const { projectId, environment } = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectId',
          message: 'Project ID:',
          default: 'my-project',
          validate: (input: string) => input.length > 0 || 'Project ID cannot be empty',
        },
        {
          type: 'list',
          name: 'environment',
          message: 'Environment:',
          choices: ['development', 'staging', 'production'],
          default: 'development',
        },
      ]);

      const config = await createDefaultConfig();
      config.projectId = projectId;
      config.environment = environment;

      await saveConfig(config);

      logSuccess(
        `Created traceinject.config.json for project "${projectId}" (${environment})`
      );
      logInfo(
        'Run "trace-inject add" to add your first tracepoint or "trace-inject validate" to check the configuration'
      );
    } catch (error) {
      logError(`Failed to initialize config: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
