import chalk from 'chalk';
import * as Table from 'cli-table3';
import { TracepointDefinition } from '../../../index.js';

export function logSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function logError(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function logInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function logWarning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

export function logSection(title: string): void {
  console.log('\n' + chalk.bold.cyan(title));
  console.log(chalk.gray('─'.repeat(title.length)) + '\n');
}

export function displayTracepoints(tracepoints: TracepointDefinition[]): void {
  if (tracepoints.length === 0) {
    logInfo('No tracepoints configured');
    return;
  }

  const table = new (Table as any)({
    head: [
      chalk.bold('ID'),
      chalk.bold('Type'),
      chalk.bold('Target'),
      chalk.bold('Captures'),
    ],
    style: { compact: true },
  });

  tracepoints.forEach((tp) => {
    const target =
      tp.type === 'before' || tp.type === 'after'
        ? `Line ${tp.lineNumber}`
        : `Function ${tp.functionName}`;

    table.push([
      chalk.cyan(tp.id),
      chalk.yellow(tp.type),
      target,
      tp.captureExpressions ? tp.captureExpressions.length : 0,
    ]);
  });

  console.log(table.toString());
}

export function displayTracepoint(tp: TracepointDefinition): void {
  console.log('\n' + chalk.bold('Tracepoint Details'));
  console.log(chalk.gray('─'.repeat(40)) + '\n');

  const details: Record<string, string | number | boolean | undefined> = {
    ID: tp.id,
    Type: tp.type,
    Description: tp.description,
    'Include Async': tp.includeAsync,
    'Include Generators': tp.includeGenerators,
  };

  if (tp.type === 'before' || tp.type === 'after') {
    details['Line Number'] = tp.lineNumber;
  } else {
    details['Function Name'] = tp.functionName;
    details['Function Path'] = tp.functionPath;
  }

  Object.entries(details).forEach(([key, value]) => {
    if (value !== undefined) {
      console.log(`${chalk.bold(key)}: ${value}`);
    }
  });

  if (tp.captureExpressions && tp.captureExpressions.length > 0) {
    console.log(`\n${chalk.bold('Capture Expressions')}:`);
    tp.captureExpressions.forEach((expr) => {
      console.log(`  ${chalk.gray('•')} ${expr}`);
    });
  }

  console.log();
}

export function displayValidationErrors(errors: string[]): void {
  if (errors.length === 0) {
    return;
  }

  logSection('Validation Errors');
  errors.forEach((error) => {
    logError(error);
  });
}
