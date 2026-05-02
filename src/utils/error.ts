import { AxiosError } from 'axios';

export class AiCliError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number = 1
  ) {
    super(message);
    this.name = 'AiCliError';
  }
}

export function handleApiError(error: unknown): never {
  if (error instanceof AiCliError) throw error;

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const body = error.response?.data as Record<string, unknown> | undefined;
    const apiMessage = (body?.error as Record<string, unknown>)?.message as string
      ?? body?.message as string
      ?? '';

    switch (status) {
      case 401:
        throw new AiCliError(
          'Неверный токен авторизации. Запустите "ai login" для настройки.',
          'AUTH_ERROR', 2
        );
      case 402:
        throw new AiCliError(
          `Недостаточно средств на балансе. ${apiMessage}`,
          'PAYMENT_REQUIRED', 2
        );
      case 403:
        throw new AiCliError(
          `Нет доступа. ${apiMessage}`,
          'FORBIDDEN', 2
        );
      case 404:
        throw new AiCliError(
          `Не найдено. ${apiMessage}`,
          'NOT_FOUND', 3
        );
      case 422:
        throw new AiCliError(
          `Невалидный запрос: ${apiMessage}`,
          'VALIDATION_ERROR', 4
        );
      case 429:
        throw new AiCliError(
          'Превышен лимит запросов. Подождите и попробуйте снова.',
          'RATE_LIMIT', 1
        );
      default:
        throw new AiCliError(
          `Ошибка API (${status}): ${apiMessage || error.message}`,
          'API_ERROR', 1
        );
    }
  }

  if (error instanceof Error) {
    throw new AiCliError(error.message, 'UNKNOWN', 1);
  }

  throw new AiCliError(String(error), 'UNKNOWN', 1);
}

export function formatError(error: unknown, json: boolean): string {
  if (error instanceof AiCliError) {
    if (json) {
      return JSON.stringify({ ok: false, error: { code: error.code, message: error.message } });
    }
    return error.message;
  }
  if (json) {
    return JSON.stringify({ ok: false, error: { code: 'UNKNOWN', message: String(error) } });
  }
  return String(error);
}
