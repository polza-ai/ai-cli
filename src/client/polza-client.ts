import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { parseSSEStream } from './streaming.js';
import { getCachedModels, setCachedModels } from './models-cache.js';
import type {
  Model, ModelsResponse, ChatCompletionRequest,
  ChatCompletionResponse, ChatCompletionChunk,
  MediaGenerationResponse,
} from './types.js';

export interface PolzaClientConfig {
  token: string;
  apiBaseUrl?: string;
}

const POLL_INTERVAL_IMAGE = 3_000;
const POLL_INTERVAL_VIDEO = 5_000;
const MAX_POLL_TIME = 300_000;

export class PolzaClient {
  private http: AxiosInstance;

  constructor(config: PolzaClientConfig) {
    this.http = axios.create({
      baseURL: config.apiBaseUrl ?? 'https://polza.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 120_000,
    });

    this.http.interceptors.response.use(undefined, async (error: AxiosError) => {
      if (error.response?.status === 429 && error.config) {
        const retryAfter = parseInt(error.response.headers['retry-after'] as string ?? '2', 10);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        return this.http.request(error.config);
      }
      throw error;
    });
  }

  async getModels(type?: string): Promise<Model[]> {
    // Type-filtered requests skip cache (rare, used in `ai models --type`)
    if (type) {
      const { data } = await this.http.get<ModelsResponse>('/models', { params: { type } });
      return data.data;
    }

    const cached = await getCachedModels();
    if (cached) return cached;

    const { data } = await this.http.get<ModelsResponse>('/models');
    await setCachedModels(data.data);
    return data.data;
  }

  async getModel(modelId: string): Promise<Model | undefined> {
    const models = await this.getModels();
    return models.find(m => m.id === modelId);
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { data } = await this.http.post<ChatCompletionResponse>(
      '/chat/completions',
      { ...request, stream: false }
    );
    return data;
  }

  async *chatCompletionStream(request: ChatCompletionRequest): AsyncGenerator<string> {
    const { data: stream } = await this.http.post(
      '/chat/completions',
      { ...request, stream: true },
      { responseType: 'stream' }
    );

    for await (const chunk of parseSSEStream(stream as AsyncIterable<Buffer>)) {
      if (chunk.error) {
        throw new Error(chunk.error.message ?? 'Ошибка генерации');
      }
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  // Unified /media endpoint for image and video generation
  async mediaGenerate(
    model: string,
    input: Record<string, unknown>,
    pollInterval: number = POLL_INTERVAL_IMAGE
  ): Promise<MediaGenerationResponse> {
    const { data } = await this.http.post<MediaGenerationResponse>(
      '/media',
      { model, input },
      { timeout: 180_000 }
    );

    if (data.status === 'completed') return data;

    return await this.pollMediaStatus(data.id, pollInterval);
  }

  async getBalance(): Promise<{ amount: number; spentAmount: number }> {
    const { data } = await this.http.get<{ amount: string; spentAmount: string }>('/balance');
    return {
      amount: parseFloat(data.amount),
      spentAmount: parseFloat(data.spentAmount),
    };
  }

  async pollMediaStatus(id: string, interval: number): Promise<MediaGenerationResponse> {
    const start = Date.now();
    while (Date.now() - start < MAX_POLL_TIME) {
      await new Promise(r => setTimeout(r, interval));
      const { data } = await this.http.get<MediaGenerationResponse>(`/media/${id}`);
      if (data.status === 'completed') return data;
      if (data.status === 'failed') {
        const msg = data.error?.message ?? 'Генерация не удалась';
        throw new Error(msg);
      }
    }
    throw new Error('Таймаут ожидания генерации (5 минут)');
  }
}
