import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Model } from './types.js';

const CACHE_DIR = join(homedir(), '.ai-cli');
const CACHE_PATH = join(CACHE_DIR, 'models-cache.json');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheData {
  timestamp: number;
  models: Model[];
}

let memoryCache: CacheData | null = null;

export async function getCachedModels(): Promise<Model[] | null> {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL) {
    return memoryCache.models;
  }

  if (!existsSync(CACHE_PATH)) return null;

  try {
    const raw = await readFile(CACHE_PATH, 'utf-8');
    const data: CacheData = JSON.parse(raw);
    if (Date.now() - data.timestamp < CACHE_TTL) {
      memoryCache = data;
      return data.models;
    }
  } catch {
    // corrupt cache
  }
  return null;
}

export async function setCachedModels(models: Model[]): Promise<void> {
  const data: CacheData = { timestamp: Date.now(), models };
  memoryCache = data;

  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
  await writeFile(CACHE_PATH, JSON.stringify(data), 'utf-8');
}
