export interface ModelParameter {
  required?: boolean;
  description?: string;
  default?: string;
  values?: string[];
  min?: number;
  max?: number;
  max_length?: number;
}

export interface Model {
  id: string;
  name: string;
  owned_by?: string;
  type?: string;
  parameters?: Record<string, ModelParameter>;
  endpoints?: string[];
}

export interface ModelsResponse {
  data: Model[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_rub?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: ChatCompletionChoice[];
  model: string;
  usage?: Usage;
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }>;
}

// /api/v1/media response
export interface MediaDataItem {
  url?: string;
  revised_prompt?: string;
}

export interface MediaGenerationResponse {
  id: string;
  object?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created?: number;
  model?: string;
  completed_at?: number;
  data?: MediaDataItem | MediaDataItem[];
  usage?: {
    output_units?: number;
    cost_rub?: number;
    cost?: number;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

export function getMediaUrls(response: MediaGenerationResponse): string[] {
  if (!response.data) return [];
  const items = Array.isArray(response.data) ? response.data : [response.data];
  return items.map(d => d.url).filter((u): u is string => !!u);
}
