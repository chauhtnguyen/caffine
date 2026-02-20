import {
  AnthropicOfficialProvider,
  AnthropicVertexProvider,
} from './anthropic';
import { CLIProxyProvider } from './cliproxy';
import { FalProvider } from './fal';
import { GeminiGenerativeProvider, GeminiVertexProvider } from './gemini';
import { MorphProvider } from './morph';
import { OllamaProvider } from './ollama';
import { OpenAIProvider } from './openai';
import { PerplexityProvider } from './perplexity';

export const CopilotProviders = [
  OpenAIProvider,
  FalProvider,
  GeminiGenerativeProvider,
  GeminiVertexProvider,
  PerplexityProvider,
  AnthropicOfficialProvider,
  AnthropicVertexProvider,
  MorphProvider,
  // caffine custom providers
  OllamaProvider,
  CLIProxyProvider,
];

export {
  AnthropicOfficialProvider,
  AnthropicVertexProvider,
} from './anthropic';
export { CLIProxyProvider } from './cliproxy';
export { CopilotProviderFactory } from './factory';
export { FalProvider } from './fal';
export { GeminiGenerativeProvider, GeminiVertexProvider } from './gemini';
export { OllamaProvider } from './ollama';
export { OpenAIProvider } from './openai';
export { PerplexityProvider } from './perplexity';
export type { CopilotProvider } from './provider';
export * from './types';
