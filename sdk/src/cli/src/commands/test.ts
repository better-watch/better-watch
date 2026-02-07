import { Command } from 'commander';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import { loadConfig } from '../utils/config-file.js';
import {
  logSuccess,
  logError,
  logInfo,
  logSection,
  logWarning,
} from '../utils/output.js';
import { TypeScriptParser } from '../../../parser/index.js';
import { TracepointInjector } from '../../../injector/index.js';

export const testCommand = new Command('test')
  .description('Dry-run transformation on a file')
  .option('-f, --file <path>', 'File to test transformation on')
  .option('-o, --output <path>', 'Output file for transformed code (optional)')
  .action(async (options: any) => {
    try {
      const config = await loadConfig();

      if (!config) {
        logError('No traceinject.config.json found in current directory');
        logInfo('Run "trace-inject init" to create one');
        process.exit(1);
      }

      let filePath = options.file;

      if (!filePath) {
        const { file } = await inquirer.prompt([
          {
            type: 'input',
            name: 'file',
            message: 'File path to test:',
            validate: async (input) => {
              const exists = await fs.pathExists(input);
              return exists || `File not found: ${input}`;
            },
          },
        ]);
        filePath = file;
      }

      logSection('Test Transformation');
      logInfo(`File: ${filePath}`);
      logInfo(`Tracepoints to apply: ${config.tracepoints?.length || 0}\n`);

      // Read the file
      const source = await fs.readFile(filePath, 'utf-8');

      // Parse the file
      const parser = new TypeScriptParser();
      const parseResult = parser.parse(source, {
        filename: filePath,
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        logError('Failed to parse file:');
        parseResult.errors.forEach((err: any) => {
          logError(`  ${err.message} at line ${err.line}`);
        });
        process.exit(1);
      }

      // Convert tracepoints to injection configs
      const injectionConfigs = (config.tracepoints || []).map((tp: any) => ({
        type: tp.type,
        lineNumber: tp.lineNumber,
        functionName: tp.functionName,
        functionPath: tp.functionPath,
        code: `__trace__("${tp.id}")`,
        includeAsync: tp.includeAsync,
        includeGenerators: tp.includeGenerators,
      }));

      // Apply injections
      const injector = new TracepointInjector();
      const injectionResult = injector.inject(source, injectionConfigs);

      if (injectionResult.errors && injectionResult.errors.length > 0) {
        logWarning('Injection warnings:');
        injectionResult.errors.forEach((err: any) => {
          logWarning(`  ${err.message}`);
        });
      }

      if (!injectionResult.code) {
        logError('Injection failed - no output generated');
        process.exit(1);
      }

      logSuccess('Transformation successful');
      logInfo(`Injections applied: ${injectionResult.injections?.length || 0}`);

      const transformedCode = injectionResult.code;

      if (options.output) {
        await fs.writeFile(options.output, transformedCode, 'utf-8');
        logSuccess(`Transformed code written to ${options.output}`);
      }

      // Show a preview
      logSection('Preview (first 20 lines)');
      const lines = transformedCode.split('\n').slice(0, 20);
      lines.forEach((line) => {
        console.log(line);
      });

      if (transformedCode.split('\n').length > 20) {
        logInfo(
          `... (${transformedCode.split('\n').length - 20} more lines)`
        );
      }

      console.log();
    } catch (error) {
      logError(
        `Test failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });
