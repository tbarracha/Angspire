
/** ----------  Common primitives  ---------- */

export type ORTextContent = {
  type: 'text';
  text: string;
};

export type ORImageContentPart = {
  type: 'image_url';
  image_url: {
    url: string;           // URL or base64
    detail?: string;       // "auto" by default
  };
};

export type ORContentPart = ORTextContent | ORImageContentPart;

/** ----------  Messages & Tools  ---------- */

export type ORBaseChatMessage = {
  name?: string;
};

export type OrUserAssistantSystemMessage = ORBaseChatMessage & {
  role: 'user' | 'assistant' | 'system';
  content: string | ORContentPart[];
};

export type ORToolMessage = ORBaseChatMessage & {
  role: 'tool';
  content: string;
  tool_call_id: string;
};

export type ORChatMessage = OrUserAssistantSystemMessage | ORToolMessage;

export type OrFunctionDescription = {
  description?: string;
  name: string;
  /** JSON-Schema */
  parameters: Record<string, any>;
};

export type ORTool = {
  type: 'function';
  function: OrFunctionDescription;
};

export type ORToolChoice =
  | 'none'
  | 'auto'
  | {
      type: 'function';
      function: { name: string };
    };

/** ----------  Request  ---------- */

export type ORChatRequest = {
  /** Either `messages` or `prompt` is required */
  messages?: ORChatMessage[];
  prompt?: string;

  model?: string;
  response_format?: { type: 'json_object' };
  stop?: string | string[];
  stream?: boolean;

  /* LLM parameters */
  max_tokens?: number;
  temperature?: number;
  tools?: ORTool[];
  tool_choice?: ORToolChoice;
  seed?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  logit_bias?: Record<number, number>;
  top_logprobs?: number;
  min_p?: number;
  top_a?: number;

  /* Predicted output */
  prediction?: { type: 'content'; content: string };

  /* OpenRouter extras */
  transforms?: string[];
  models?: string[];
  route?: 'fallback';
  provider?: ORProviderPreferences;
  user?: string;
};

/** Placeholder for OpenRouter provider preferences (customise as needed) */
export type ORProviderPreferences = Record<string, any>;

/** ----------  Response  ---------- */

export type ORToolCall = {
  id: string;
  type: 'function';
  function: ORFunctionCall;
};

export type ORNonChatChoice = {
  finish_reason: string | null;
  text: string;
  error?: ORErrorResponse;
};

export type ORNonStreamingChoice = {
  finish_reason: string | null;
  native_finish_reason: string | null;
  message: {
    content: string | null;
    role: string;
    tool_calls?: ORToolCall[];
  };
  error?: ORErrorResponse;
};

export type ORStreamingChoice = {
  finish_reason: string | null;
  native_finish_reason: string | null;
  delta: {
    content: string | null;
    role?: string;
    tool_calls?: ORToolCall[];
  };
  error?: ORErrorResponse;
};

export type ORChatResponseUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type ORChatResponse = {
  id: string;
  choices: Array<ORNonStreamingChoice | ORStreamingChoice | ORNonChatChoice>;
  created: number; // Unix
  model: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  system_fingerprint?: string;
  usage?: ORChatResponseUsage;
};

export type ORErrorResponse = {
  code: number;
  message: string;
  metadata?: Record<string, unknown>;
};

export type ORFunctionCall = {
  name: string;
  arguments: Record<string, any>;
};
