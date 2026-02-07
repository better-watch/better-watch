import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  loadConfig,
  saveConfig,
  validateConfig,
} from '../utils/config-file.js';
import {
  logSuccess,
  logError,
  logInfo,
  logSection,
  displayValidationErrors,
  displayTracepoint,
} from '../utils/output.js';
import { TracepointDefinition } from '../../../index.js';

export const addCommand = new Command('add')
  .description('Add a tracepoint interactively')
  .action(async () => {
    try {
      const config = await loadConfig();

      if (!config) {
        logError('No traceinject.config.json found in current directory');
        logInfo('Run "trace-inject init" to create one');
        process.exit(1);
      }

      logSection('Add New Tracepoint');

      const { id, type } = await inquirer.prompt([
        {
          type: 'input',
          name: 'id',
          message: 'Tracepoint ID:',
          validate: (input: string) => {
            if (!input.length) return 'ID cannot be empty';
            if (config.tracepoints?.some((tp) => tp.id === input)) {
              return 'ID already exists';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'type',
          message: 'Tracepoint type:',
          choices: ['before', 'after', 'entry', 'exit'],
        },
      ]);

      let lineNumber: number | undefined;
      let functionName: string | undefined;
      let functionPath: string | undefined;

      if (type === 'before' || type === 'after') {
        const { line } = await inquirer.prompt([
          {
            type: 'number',
            name: 'line',
            message: 'Line number:',
            validate: (input: number) => input > 0 || 'Line number must be positive',
          },
        ]);
        lineNumber = line;
      } else {
        const { func, path } = await inquirer.prompt([
          {
            type: 'input',
            name: 'func',
            message: 'Function name:',
            validate: (input: string) => input.length > 0 || 'Function name cannot be empty',
          },
          {
            type: 'input',
            name: 'path',
            message: 'Function path (optional, for nested functions):',
          },
        ]);
        functionName = func;
        functionPath = path || undefined;
      }

      const { description, captureExpressions, includeAsync, includeGenerators } =
        await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: 'Description (optional):',
          },
          {
            type: 'input',
            name: 'captureExpressions',
            message:
              'Capture expressions (comma-separated, e.g., "this.prop, arg1, arg2"):',
          },
          {
            type: 'confirm',
            name: 'includeAsync',
            message: 'Include async functions?',
            default: true,
          },
          {
            type: 'confirm',
            name: 'includeGenerators',
            message: 'Include generators?',
            default: false,
          },
        ]);

      const tracepoint: TracepointDefinition = {
        id,
        type,
        lineNumber,
        functionName,
        functionPath,
        description: description || undefined,
        captureExpressions: captureExpressions
          ? captureExpressions.split(',').map((e: string) => e.trim())
          : undefined,
        includeAsync,
        includeGenerators,
      };

      if (!config.tracepoints) {
        config.tracepoints = [];
      }

      config.tracepoints.push(tracepoint);

      // Validate before saving
      const errors = validateConfig(config);
      if (errors.length > 0) {
        logError('Validation failed:');
        displayValidationErrors(errors);
        process.exit(1);
      }

      await saveConfig(config);

      logSuccess(`Tracepoint "${id}" added successfully`);
      displayTracepoint(tracepoint);
    } catch (error) {
      logError(
        `Failed to add tracepoint: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });
