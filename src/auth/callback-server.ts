import { createServer, type Server } from 'node:http';
import { URL } from 'node:url';
import { AiCliError } from '../utils/error.js';

const TIMEOUT_MS = 300_000;

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AI CLI</title></head>
<body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
<div style="text-align:center">
<h1>Авторизация успешна!</h1>
<p>Можно закрыть эту вкладку и вернуться в терминал.</p>
</div></body></html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AI CLI</title></head>
<body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
<div style="text-align:center">
<h1>Ошибка авторизации</h1>
<p>Доступ отклонён. Попробуйте снова.</p>
</div></body></html>`;

export interface CallbackServerResult {
  port: number;
  callbackUrl: string;
  codePromise: Promise<string>;
  close: () => void;
}

export function startCallbackServer(expectedState: string): Promise<CallbackServerResult> {
  return new Promise((resolveServer, rejectServer) => {
    let codeResolve: (code: string) => void;
    let codeReject: (err: Error) => void;
    const codePromise = new Promise<string>((res, rej) => {
      codeResolve = res;
      codeReject = rej;
    });

    const server: Server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const error = url.searchParams.get('error');
      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(ERROR_HTML);
        codeReject!(new AiCliError('Авторизация отклонена пользователем.', 'AUTH_DENIED', 2));
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(ERROR_HTML);
        codeReject!(new AiCliError('Неверные параметры callback.', 'AUTH_INVALID', 2));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(SUCCESS_HTML);
      codeResolve!(code);
    });

    const timeout = setTimeout(() => {
      server.close();
      codeReject!(new AiCliError('Таймаут авторизации (2 минуты).', 'AUTH_TIMEOUT', 2));
    }, TIMEOUT_MS);

    codePromise.finally(() => {
      clearTimeout(timeout);
      server.close();
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        rejectServer(new Error('Не удалось запустить callback-сервер'));
        return;
      }
      const port = addr.port;
      resolveServer({
        port,
        callbackUrl: `http://localhost:${port}/callback`,
        codePromise,
        close: () => {
          clearTimeout(timeout);
          server.close();
        },
      });
    });
  });
}
