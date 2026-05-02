import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

/**
 * Display image inline in terminal.
 * Supports: iTerm2, Kitty, chafa (universal fallback).
 */
export async function displayInlineImage(filePath: string): Promise<void> {
  if (isIterm2()) {
    await displayIterm2(filePath);
  } else if (isKitty()) {
    await displayKitty(filePath);
  } else {
    displayChafa(filePath);
  }
}

export function supportsInlineImages(): boolean {
  return isIterm2() || isKitty() || hasChafa();
}

function isIterm2(): boolean {
  return process.env.TERM_PROGRAM === 'iTerm.app'
    || !!process.env.ITERM_SESSION_ID;
}

function isKitty(): boolean {
  return process.env.TERM === 'xterm-kitty'
    || !!process.env.KITTY_PID;
}

let _hasChafa: boolean | null = null;
function hasChafa(): boolean {
  if (_hasChafa === null) {
    try {
      execFileSync('chafa', ['--version'], { stdio: 'ignore' });
      _hasChafa = true;
    } catch {
      _hasChafa = false;
    }
  }
  return _hasChafa;
}

function displayChafa(filePath: string): void {
  if (!hasChafa()) return;
  try {
    const cols = process.stderr.columns ?? 60;
    const width = Math.min(cols - 4, 50);
    const output = execFileSync('chafa', [
      filePath,
      '--size', `${width}x${Math.round(width / 2)}`,
      '--animate', 'off',
    ], { encoding: 'utf-8' });
    process.stderr.write(output);
  } catch {
    // chafa failed, skip
  }
}

async function displayIterm2(filePath: string): Promise<void> {
  const data = await readFile(filePath);
  const b64 = data.toString('base64');
  const args = `size=${data.length};inline=1;width=40;preserveAspectRatio=1`;
  process.stderr.write(`\x1b]1337;File=${args}:${b64}\x07\n`);
}

async function displayKitty(filePath: string): Promise<void> {
  const data = await readFile(filePath);
  const b64 = data.toString('base64');
  const chunkSize = 4096;
  for (let i = 0; i < b64.length; i += chunkSize) {
    const chunk = b64.slice(i, i + chunkSize);
    const isLast = i + chunkSize >= b64.length;
    if (i === 0) {
      process.stderr.write(`\x1b_Gf=100,a=T,m=${isLast ? 0 : 1};${chunk}\x1b\\`);
    } else {
      process.stderr.write(`\x1b_Gm=${isLast ? 0 : 1};${chunk}\x1b\\`);
    }
  }
  process.stderr.write('\n');
}
