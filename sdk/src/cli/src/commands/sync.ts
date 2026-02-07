import { Command } from 'commander';
import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../utils/config-file.js';
import {
  logSuccess,
  logError,
  logInfo,
  logSection,
  displayTracepoints,
} from '../utils/output.js';

interface RemoteConfig {
  projectId: string;
  environment: string;
  tracepoints: any[];
}

export const syncCommand = new Command('sync')
  .description('Sync with remote configuration')
  .option('-u, --url <url>', 'Remote config server URL')
  .option('-k, --key <key>', 'API key for authentication')
  .option('--dry-run', 'Preview changes without applying')
  .action(async (options: any) => {
    try {
      const config = await loadConfig();

      if (!config) {
        logError('No traceinject.config.json found in current directory');
        logInfo('Run "trace-inject init" to create one');
        process.exit(1);
      }

      let serverUrl = options.url;
      let apiKey = options.key;

      if (!serverUrl || !apiKey) {
        logSection('Remote Configuration Sync');

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'url',
            message: 'Config server URL:',
            default: serverUrl,
            validate: (input: string) => input.length > 0 || 'URL cannot be empty',
          },
          {
            type: 'password',
            name: 'key',
            message: 'API key:',
            default: apiKey,
            validate: (input: string) => input.length > 0 || 'API key cannot be empty',
          },
        ]);

        serverUrl = answers.url;
        apiKey = answers.key;
      }

      logInfo('Connecting to remote server...\n');

      // Fetch remote configuration
      let remoteConfig: RemoteConfig;

      try {
        const response = await fetch(`${serverUrl}/config/export`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        remoteConfig = (await response.json()) as RemoteConfig;
      } catch (error) {
        logError(
          `Failed to fetch remote config: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }

      logSuccess('Remote config fetched');
      logInfo(
        `Remote project: ${remoteConfig.projectId} (${remoteConfig.environment})`
      );
      logInfo(`Remote tracepoints: ${remoteConfig.tracepoints?.length || 0}`);

      if (options.dryRun) {
        logSection('Dry-run: Changes to be applied');
        displayTracepoints(remoteConfig.tracepoints || []);
        logInfo('Run without --dry-run to apply changes');
        return;
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message:
            'Replace local tracepoints with remote configuration?',
          default: false,
        },
      ]);

      if (!confirm) {
        logInfo('Sync cancelled');
        return;
      }

      // Update config with remote tracepoints
      config.tracepoints = remoteConfig.tracepoints || [];
      config.projectId = remoteConfig.projectId;
      config.environment = remoteConfig.environment;

      await saveConfig(config);

      logSuccess('Configuration synced successfully');
      logInfo(`Tracepoints synced: ${config.tracepoints.length}`);
      console.log();
    } catch (error) {
      logError(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });
