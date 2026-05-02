import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/config.js';
import { PolzaClient } from '../client/polza-client.js';
import { handleApiError } from '../utils/error.js';
import { AiCliError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { downloadToFile, generateOutputPath } from '../utils/fs.js';
import { getMediaUrls } from '../client/types.js';
import { buildMediaInput, parseSetParams, formatModelParams } from '../utils/media-params.js';
import { readStdin } from '../utils/stdin.js';
import { printCostInfo } from '../utils/cost.js';

const DEFAULT_MODEL = 'google/veo3_fast';

export function registerVideoCommand(program: Command): void {
  program
    .command('video [prompt]')
    .description('Генерация видео')
    .option('-m, --model <model>', 'Модель', DEFAULT_MODEL)
    .option('-o, --output <path>', 'Путь для сохранения')
    .option('-n, --count <n>', 'Количество видео', parseInt, 1)
    .option('-i, --image <url>', 'URL изображения (image-to-video)')
    .option('--aspect-ratio <ratio>', 'Соотношение сторон')
    .option('--duration <value>', 'Длительность')
    .option('--resolution <res>', 'Разрешение')
    .option('-s, --set <key=value...>', 'Доп. параметры модели')
    .option('-p, --concurrency <n>', 'Параллельность', parseInt, 2)
    .option('--params', 'Показать доступные параметры модели')
    .option('--json', 'JSON-вывод')
    .action(async (prompt: string | undefined, opts) => {
      try {
        const config = await loadConfig();
        const client = new PolzaClient(config);
        const model = opts.model ?? config.defaultModel?.video ?? DEFAULT_MODEL;

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

        // Resolve image URL: --image flag or stdin (piped from ai image)
        let imageUrl = opts.image as string | undefined;
        const stdinText = await readStdin();

        if (!imageUrl && stdinText) {
          // stdin may contain URL(s) from ai image pipe
          const lines = stdinText.split('\n').map(l => l.trim()).filter(Boolean);
          const urlLine = lines.find(l => l.startsWith('http'));
          if (urlLine) {
            imageUrl = urlLine;
            // If no prompt given, use stdin non-URL lines as prompt
            if (!prompt) {
              const nonUrls = lines.filter(l => !l.startsWith('http')).join(' ');
              if (nonUrls) prompt = nonUrls;
            }
          } else if (!prompt) {
            prompt = stdinText;
          }
        }

        if (!prompt && !imageUrl) {
          throw new AiCliError(
            'Укажите prompt или передайте изображение через --image / stdin.',
            'NO_INPUT'
          );
        }

        const userParams: Record<string, string> = {};
        if (opts.aspectRatio) userParams.aspect_ratio = opts.aspectRatio;
        if (opts.duration) userParams.duration = opts.duration;
        if (opts.resolution) userParams.resolution = opts.resolution;
        Object.assign(userParams, parseSetParams(opts.set ?? []));

        const modelInfo = await client.getModel(model);

        const count = opts.count ?? 1;
        const concurrency = opts.concurrency ?? 2;
        const results: Array<{ path: string; url: string }> = [];
        const errors: Error[] = [];
        let totalCost = 0;

        const spinner = ora(`Генерация видео (0/${count})...`).start();
        let completed = 0;

        const runTask = async () => {
          try {
            const input = buildMediaInput(
              prompt ?? 'animate this image',
              userParams,
              modelInfo
            );

            // Add image as starting frame
            if (imageUrl) {
              input.images = [{ type: 'url', data: imageUrl }];
            }

            const response = await client.mediaGenerate(model, input, 5_000);
            totalCost += response.usage?.cost_rub ?? response.usage?.cost ?? 0;
            const urls = getMediaUrls(response);

            for (const url of urls) {
              const outputPath = opts.output && count === 1 && urls.length === 1
                ? opts.output
                : generateOutputPath('video', 'mp4');

              await downloadToFile(url, outputPath);
              results.push({ path: outputPath, url });
            }
          } catch (err) {
            errors.push(err instanceof Error ? err : new Error(String(err)));
          } finally {
            completed++;
            spinner.text = `Генерация видео (${completed}/${count})...`;
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
          spinner.succeed(`Сгенерировано ${results.length} видео`);
        } else {
          spinner.fail('Не удалось сгенерировать видео');
        }

        if (opts.json) {
          process.stdout.write(jsonOutput(results) + '\n');
        } else {
          for (const r of results) {
            console.log(chalk.green('✓'), r.path);
          }
          for (const e of errors) {
            console.error(chalk.red('✗'), e.message);
          }
        }

        if (results.length > 0) await printCostInfo(client, totalCost);

        if (errors.length > 0 && results.length > 0) process.exitCode = 2;
        if (errors.length > 0 && results.length === 0) process.exitCode = 1;
      } catch (error) {
        handleApiError(error);
      }
    });
}
