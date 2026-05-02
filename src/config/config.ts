import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { configSchema, type AiCliConfig } from './config.schema.js';

export const CONFIG_DIR = join(homedir(), '.ai-cli');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<AiCliConfig> {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error('Конфигурация не найдена. Запустите "ai login" для авторизации.');
  }
  const content = await readFile(CONFIG_PATH, 'utf-8');
  return configSchema.parse(JSON.parse(content));
}

export async function saveConfig(config: AiCliConfig): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function deleteConfig(): Promise<void> {
  if (existsSync(CONFIG_PATH)) {
    await rm(CONFIG_PATH);
  }
}

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}
