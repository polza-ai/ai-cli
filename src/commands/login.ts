import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { generateCodeVerifier, generateCodeChallenge, generateState, buildAuthorizeUrl, exchangeCodeForToken } from '../auth/oauth.js';
import { startCallbackServer } from '../auth/callback-server.js';
import { saveConfig } from '../config/config.js';
import { openBrowser } from '../utils/open-browser.js';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Авторизация через Polza AI (OAuth PKCE)')
    .action(async () => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      const { port, callbackUrl, codePromise, close } = await startCallbackServer(state);
      const authorizeUrl = buildAuthorizeUrl({ callbackUrl, codeChallenge, state });

      console.log();
      console.log('Откройте ссылку в браузере для авторизации:');
      console.log(chalk.cyan(authorizeUrl));
      console.log();
      await openBrowser(authorizeUrl);

      const spinner = ora('Ожидание авторизации в браузере...').start();

      try {
        const code = await codePromise;
        spinner.text = 'Получение токена...';

        const { key, user_id } = await exchangeCodeForToken({
          code,
          codeVerifier,
          callbackUrl,
        });

        await saveConfig({
          token: key,
          userId: user_id,
          apiBaseUrl: 'https://polza.ai/api/v1',
        });

        spinner.succeed(chalk.green('Авторизация успешна!'));
        console.log(chalk.dim(`User ID: ${user_id}`));
      } catch (error) {
        spinner.fail('Ошибка авторизации');
        close();
        throw error;
      }
    });
}
