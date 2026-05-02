import type { ChatCompletionChunk } from './types.js';

export async function* parseSSEStream(
  stream: AsyncIterable<Buffer | string>
): AsyncGenerator<ChatCompletionChunk> {
  let buffer = '';

  for await (const chunk of stream) {
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          yield JSON.parse(data) as ChatCompletionChunk;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
