import { Command } from 'commander';
import { loadConfig } from '../config/config.js';
import { PolzaClient } from '../client/polza-client.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatModelsTable } from '../formatters/models-table.js';

export function registerModelsCommand(program: Command): void {
  program
    .command('models')
    .description('Список доступных моделей')
    .option('--type <type>', 'Тип модели (chat, image, video)')
    .option('--json', 'JSON-вывод')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = new PolzaClient(config);
        const models = await client.getModels(opts.type);

        if (opts.json) {
          process.stdout.write(jsonOutput(models) + '\n');
        } else {
          if (models.length === 0) {
            console.log('Модели не найдены.');
          } else {
            console.log(formatModelsTable(models));
          }
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}
