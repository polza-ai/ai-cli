import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config/config.js';
import { PolzaClient } from '../client/polza-client.js';
import { resolvePrompt } from '../utils/prompt.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { printCostInfo } from '../utils/cost.js';

const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite-preview';

export function registerTextCommand(program: Command): void {
  program
    .command('text [prompt]')
    .description('Генерация текста')
    .option('-m, --model <model>', 'Модель', DEFAULT_MODEL)
    .option('--temperature <n>', 'Температура (0-2)', parseFloat)
    .option('--max-tokens <n>', 'Максимум токенов', parseInt)
    .option('--system-prompt <text>', 'Системный промпт')
    .option('--no-stream', 'Отключить streaming')
    .option('--json', 'JSON-вывод')
    .action(async (prompt: string | undefined, opts) => {
      try {
        const config = await loadConfig();
        const client = new PolzaClient(config);
        const model = opts.model ?? config.defaultModel?.text ?? DEFAULT_MODEL;
        const messages = await resolvePrompt(prompt, { systemPrompt: opts.systemPrompt });

        const request = {
          model,
          messages,
          ...(opts.temperature !== undefined && { temperature: opts.temperature }),
          ...(opts.maxTokens !== undefined && { max_tokens: opts.maxTokens }),
        };

        if (opts.stream !== false) {
          let fullText = '';
          for await (const chunk of client.chatCompletionStream(request)) {
            if (!opts.json) process.stdout.write(chunk);
            fullText += chunk;
          }
          if (!opts.json) process.stdout.write('\n');

          if (opts.json) {
            process.stdout.write(jsonOutput({ text: fullText, model }) + '\n');
          }
          await printCostInfo(client, undefined);
        } else {
          const response = await client.chatCompletion(request);
          const text = response.choices[0]?.message?.content ?? '';
          const costRub = (response.usage as any)?.cost_rub ?? (response.usage as any)?.cost;

          if (opts.json) {
            process.stdout.write(jsonOutput({
              text,
              model: response.model,
              usage: response.usage,
            }) + '\n');
          } else {
            process.stdout.write(text + '\n');
          }
          await printCostInfo(client, costRub);
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}
