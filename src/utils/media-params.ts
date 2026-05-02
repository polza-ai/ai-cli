import type { Model, ModelParameter } from '../client/types.js';
import { AiCliError } from './error.js';

/**
 * Build media input from user --set params + model defaults.
 * Validates values against model.parameters if available.
 */
export function buildMediaInput(
  prompt: string,
  userParams: Record<string, string>,
  model?: Model
): Record<string, unknown> {
  const input: Record<string, unknown> = { prompt };
  const modelParams = model?.parameters ?? {};

  // Apply defaults and check required params
  for (const [key, spec] of Object.entries(modelParams)) {
    if (key === 'prompt' || key === 'images' || key === 'videos') continue;
    if (key in userParams) continue;
    if (spec.default !== undefined) {
      input[key] = spec.default;
    } else if (spec.required && spec.values?.length) {
      // Auto-pick first allowed value for required params with enum
      input[key] = spec.values[0];
    }
  }

  // Apply user params, validate against model spec
  for (const [key, value] of Object.entries(userParams)) {
    const spec = modelParams[key];
    if (spec?.values && !spec.values.includes(value)) {
      throw new AiCliError(
        `Параметр "${key}" = "${value}" недопустим. Допустимые значения: ${spec.values.join(', ')}`,
        'INVALID_PARAM'
      );
    }
    input[key] = value;
  }

  return input;
}

/**
 * Parse --set arguments: ["key=value", "key2=value2"] → Record
 */
export function parseSetParams(sets: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const s of sets) {
    const eq = s.indexOf('=');
    if (eq === -1) {
      throw new AiCliError(`Неверный формат параметра: "${s}". Используйте key=value`, 'INVALID_PARAM');
    }
    params[s.slice(0, eq)] = s.slice(eq + 1);
  }
  return params;
}

/**
 * Format model parameters for display
 */
export function formatModelParams(model: Model): string {
  const params = model.parameters;
  if (!params) return 'Параметры не указаны';

  const lines: string[] = [];
  for (const [key, spec] of Object.entries(params)) {
    if (key === 'prompt') continue;
    const parts: string[] = [key];
    if (spec.required) parts.push('(обязательный)');
    if (spec.values) parts.push(`[${spec.values.join(', ')}]`);
    if (spec.default) parts.push(`default: ${spec.default}`);
    if (spec.description) parts.push(`— ${spec.description}`);
    lines.push('  ' + parts.join(' '));
  }
  return lines.join('\n');
}
