#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerLoginCommand } from '../src/commands/login.js';
import { registerLogoutCommand } from '../src/commands/logout.js';
import { registerTextCommand } from '../src/commands/text.js';
import { registerImageCommand } from '../src/commands/image.js';
import { registerVideoCommand } from '../src/commands/video.js';
import { registerModelsCommand } from '../src/commands/models.js';
import { formatError } from '../src/utils/error.js';

const __filename = fileURLToPath(import.meta.url);
let pkgDir = dirname(__filename);
while (!existsSync(join(pkgDir, 'package.json'))) {
  const parent = dirname(pkgDir);
  if (parent === pkgDir) break;
  pkgDir = parent;
}
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('ai')
  .description('CLI для генерации текста, изображений и видео через Polza AI')
  .version(`${pkg.version}\n\nhttps://github.com/polza-ai/ai-cli\n\nСделано с ❤️ в polza.ai — №1 LLM агрегатор в России\nhttps://polza.ai`);

registerLoginCommand(program);
registerLogoutCommand(program);
registerTextCommand(program);
registerImageCommand(program);
registerVideoCommand(program);
registerModelsCommand(program);

program.hook('postAction', () => {});

// Global error handler
const originalParse = program.parseAsync.bind(program);
program.parseAsync = async (argv?: string[]) => {
  try {
    return await originalParse(argv);
  } catch (error) {
    const isJson = process.argv.includes('--json');
    const exitCode = error instanceof Error && 'exitCode' in error ? (error as any).exitCode : 1;
    const msg = formatError(error, false) + '\n';
    if (isJson) {
      process.stdout.write(formatError(error, true) + '\n');
    }
    // Ensure stderr is flushed before exit
    await new Promise<void>(r => {
      process.stderr.write(msg, () => r());
    });
    process.exit(exitCode);
  }
};

program.parseAsync();
