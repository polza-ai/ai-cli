import Table from 'cli-table3';
import chalk from 'chalk';
import type { Model } from '../client/types.js';

export function formatModelsTable(models: Model[]): string {
  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Название'),
      chalk.bold('Тип'),
      chalk.bold('Провайдер'),
    ],
    style: { head: [] },
  });

  for (const model of models) {
    const provider = model.owned_by ?? model.id.split('/')[0] ?? '';
    table.push([model.id, model.name ?? model.id, model.type ?? '', provider]);
  }

  return table.toString();
}
