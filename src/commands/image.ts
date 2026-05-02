import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/config.js';
import { PolzaClient } from '../client/polza-client.js';
import { resolvePrompt } from '../utils/prompt.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { downloadToFile, generateOutputPath } from '../utils/fs.js';
import { getMediaUrls } from '../client/types.js';
import { buildMediaInput, parseSetParams, formatModelParams } from '../utils/media-params.js';
import { displayInlineImage } from '../utils/inline-image.js';

const DEFAULT_MODEL = 'openai/gpt-image-1.5';

export function registerImageCommand(program: Command): void {
  program
    .command('image [prompt]')
    .description('Генерация изображений')
    .option('-m, --model <model>', 'Модель', DEFAULT_MODEL)
    .option('-o, --output <path>', 'Путь для сохранения')
    .option('-n, --count <n>', 'Количество изображений', parseInt, 1)
    .option('--aspect-ratio <ratio>', 'Соотношение сторон')
    .option('--quality <quality>', 'Качество')
    .option('--size <WxH>', 'Размер')
    .option('-s, --set <key=value...>', 'Доп. параметры модели')
    .option('-p, --concurrency <n>', 'Параллельность', parseInt, 4)
    .option('--no-preview', 'Не показывать превью в терминале')
    .option('--params', 'Показать доступные параметры модели')
    .option('--json', 'JSON-вывод')
    .action(async (prompt: string | undefined, opts) => {
      try {
        const config = await loadConfig();
        const client = new PolzaClient(config);
        const model = opts.model ?? config.defaultModel?.image ?? DEFAULT_MODEL;

        if (opts.params) {
          const modelInfo = await client.getModel(model);
          if (modelInfo) {
            console.log(chalk.bold(`Параметры модели ${model}:`));
            console.log(formatModelParams(modelInfo));
          } else {
            console.log(`Модель ${model} не найдена`);
          }
          return;
        }

        const messages = await resolvePrompt(prompt);
        const userPrompt = messages.find(m => m.role === 'user')!.content;

        const userParams: Record<string, string> = {};
        if (opts.aspectRatio) userParams.aspect_ratio = opts.aspectRatio;
        if (opts.quality) userParams.quality = opts.quality;
        if (opts.size) userParams.size = opts.size;
        Object.assign(userParams, parseSetParams(opts.set ?? []));

        const modelInfo = await client.getModel(model);

        const count = opts.count ?? 1;
        const concurrency = opts.concurrency ?? 4;
        const results: Array<{ path: string; url: string }> = [];
        const errors: Error[] = [];
        const isTTY = process.stdout.isTTY;

        const spinner = ora(`Генерация изображений (0/${count})...`).start();
        let completed = 0;

        const runTask = async () => {
          try {
            const input = buildMediaInput(userPrompt, userParams, modelInfo);
            const response = await client.mediaGenerate(model, input, 3_000);
            const urls = getMediaUrls(response);

            for (const url of urls) {
              const outputPath = opts.output && count === 1 && urls.length === 1
                ? opts.output
                : generateOutputPath('image', 'png');

              await downloadToFile(url, outputPath);
              results.push({ path: outputPath, url });
            }
          } catch (err) {
            errors.push(err instanceof Error ? err : new Error(String(err)));
          } finally {
            completed++;
            spinner.text = `Генерация изображений (${completed}/${count})...`;
          }
        };

        const running = new Set<Promise<void>>();
        for (let i = 0; i < count; i++) {
          const p = runTask().then(() => { running.delete(p); });
          running.add(p);
          if (running.size >= concurrency) {
            await Promise.race(running);
          }
        }
        await Promise.all(running);

        if (results.length > 0) {
          spinner.succeed(`Сгенерировано ${results.length} изображений`);
        } else {
          spinner.fail('Не удалось сгенерировать изображения');
        }

        if (opts.json) {
          process.stdout.write(jsonOutput(results) + '\n');
        } else if (!isTTY) {
          // Piped — output URLs for chaining (e.g. ai image "cat" | ai video)
          for (const r of results) {
            process.stdout.write(r.url + '\n');
          }
        } else {
          for (const r of results) {
            // Inline preview in terminal
            if (opts.preview !== false) {
              await displayInlineImage(r.path);
            }
            console.log(chalk.green('✓'), r.path);
          }
          for (const e of errors) {
            console.error(chalk.red('✗'), e.message);
          }
        }

        if (errors.length > 0 && results.length > 0) process.exitCode = 2;
        if (errors.length > 0 && results.length === 0) process.exitCode = 1;
      } catch (error) {
        handleApiError(error);
      }
    });
}
