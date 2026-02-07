#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { listCommand } from './commands/list.js';
import { addCommand } from './commands/add.js';
import { removeCommand } from './commands/remove.js';
import { testCommand } from './commands/test.js';
import { syncCommand } from './commands/sync.js';

const program = new Command();

program
  .name('trace-inject')
  .description('CLI tool for managing trace injection configurations')
  .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(validateCommand);
program.addCommand(listCommand);
program.addCommand(addCommand);
program.addCommand(removeCommand);
program.addCommand(testCommand);
program.addCommand(syncCommand);

program.parse(process.argv);
