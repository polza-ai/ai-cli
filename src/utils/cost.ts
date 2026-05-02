import chalk from 'chalk';
import type { PolzaClient } from '../client/polza-client.js';

export function formatCost(costRub: number): string {
  if (costRub < 0.01) return `${(costRub * 100).toFixed(2)} коп.`;
  return `${costRub.toFixed(2)} ₽`;
}

export async function printCostInfo(
  client: PolzaClient,
  costRub: number | undefined,
): Promise<void> {
  const parts: string[] = [];

  if (costRub !== undefined) {
    parts.push(`стоимость: ${chalk.yellow(formatCost(costRub))}`);
  }

  try {
    const balance = await client.getBalance();
    parts.push(`баланс: ${chalk.green(formatCost(balance.amount))}`);
  } catch {
    // balance endpoint may fail, skip
  }

  if (parts.length > 0) {
    process.stderr.write(chalk.dim(`  ${parts.join(' · ')}\n`));
  }
}
