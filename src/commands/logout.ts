import { Command } from 'commander';
import chalk from 'chalk';
import { deleteConfig, configExists } from '../config/config.js';

export function registerLogoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Выход из аккаунта (удаление токена)')
    .action(async () => {
      if (!configExists()) {
        console.log(chalk.dim('Вы не авторизованы.'));
        return;
      }
      await deleteConfig();
      console.log(chalk.green('Вы вышли из аккаунта. Токен удалён.'));
    });
}
