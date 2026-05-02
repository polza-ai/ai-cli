import { readFile } from 'node:fs/promises';

/**
 * Display image inline in terminal.
 * Supports: iTerm2, Kitty, fallback to file path.
 */
export async function displayInlineImage(filePath: string): Promise<void> {
  if (isIterm2()) {
    await displayIterm2(filePath);
  } else if (isKitty()) {
    await displayKitty(filePath);
  }
  // No fallback — caller prints path separately
}

export function supportsInlineImages(): boolean {
  return isIterm2() || isKitty();
}

function isIterm2(): boolean {
  return process.env.TERM_PROGRAM === 'iTerm.app'
    || !!process.env.ITERM_SESSION_ID;
}

function isKitty(): boolean {
  return process.env.TERM === 'xterm-kitty'
    || !!process.env.KITTY_PID;
}

async function displayIterm2(filePath: string): Promise<void> {
  const data = await readFile(filePath);
  const b64 = data.toString('base64');
  // iTerm2 inline image protocol
  // ESC ] 1337 ; File=[args] : base64data ST
  const args = `size=${data.length};inline=1;width=40;preserveAspectRatio=1`;
  process.stderr.write(`\x1b]1337;File=${args}:${b64}\x07\n`);
}

async function displayKitty(filePath: string): Promise<void> {
  const data = await readFile(filePath);
  const b64 = data.toString('base64');
  // Kitty graphics protocol — send in chunks of 4096
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
