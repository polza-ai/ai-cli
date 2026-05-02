import type { ChatMessage } from '../client/types.js';
import { readStdin } from './stdin.js';
import { AiCliError } from './error.js';

export async function resolvePrompt(
  argPrompt: string | undefined,
  opts: { systemPrompt?: string } = {}
): Promise<ChatMessage[]> {
  const stdinText = await readStdin();
  const userContent = [argPrompt, stdinText].filter(Boolean).join('\n\n');

  if (!userContent) {
    throw new AiCliError(
      'Prompt обязателен. Передайте как аргумент или через stdin.',
      'NO_PROMPT'
    );
  }

  const messages: ChatMessage[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: 'system', content: opts.systemPrompt });
  }
  messages.push({ role: 'user', content: userContent });
  return messages;
}
