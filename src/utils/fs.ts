import axios from 'axios';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function downloadToFile(url: string, outputPath: string): Promise<void> {
  const { data } = await axios.get(url, { responseType: 'arraybuffer' });
  await writeFile(outputPath, Buffer.from(data));
}

export function generateOutputPath(prefix: string, ext: string, outputDir: string = '.'): string {
  const timestamp = Date.now();
  return join(outputDir, `${prefix}-${timestamp}.${ext}`);
}
