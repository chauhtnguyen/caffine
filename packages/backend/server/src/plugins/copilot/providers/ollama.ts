import { createOpenAI } from '@ai-sdk/openai';
import { embedMany, generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';

import {
  CopilotPromptInvalid,
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../base';
import { CopilotProvider } from './provider';
import type {
  CopilotChatOptions,
  CopilotEmbeddingOptions,
  CopilotProviderModel,
  CopilotStructuredOptions,
  ModelConditions,
  PromptMessage,
} from './types';
import { CopilotProviderType, ModelInputType, ModelOutputType } from './types';
import { chatToGPTMessage, TextStreamParser } from './utils';

export type OllamaConfig = {
  baseURL?: string;
  models?: string[];
};

export class OllamaProvider extends CopilotProvider<OllamaConfig> {
  static readonly ID = 'ollama';
  readonly type = CopilotProviderType.Ollama;

  private provider?: ReturnType<typeof createOpenAI>;

  get models(): CopilotProviderModel[] {
    // Default Ollama models - can be customized via config
    const defaultModels = [
      'llama3.2',
      'llama3.1',
      'llama3',
      'llama2',
      'mistral',
      'mixtral',
      'gemma2',
      'gemma',
      'qwen2.5',
      'phi3',
      'deepseek-coder-v2',
      'codellama',
      'nomic-embed-text',
    ];

    const configuredModels = this.config.models || defaultModels;

    return configuredModels.map(modelId => ({
      id: modelId,
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Text],
          defaultForOutputType: modelId === 'llama3.2',
        },
        // Add embedding capability for embedding models
        ...(modelId.includes('embed')
          ? [
              {
                input: [ModelInputType.Text],
                output: [ModelOutputType.Embedding],
                defaultForOutputType: true,
              },
            ]
          : []),
      ],
    }));
  }

  override configured() {
    // Ollama doesn't require API keys, just a base URL
    // Default to localhost if not configured
    return true;
  }

  private getProvider() {
    if (!this.provider) {
      const baseURL = this.config.baseURL || 'http://localhost:11434/v1';

      this.provider = createOpenAI({
        baseURL,
        apiKey: 'ollama', // Ollama doesn't need a real API key
        compatibility: 'compatible', // Ensure compatibility mode
      });
    }
    return this.provider;
  }

  private getModel(model: string | ModelConditions) {
    const modelId = typeof model === 'string' ? model : model.modelId;

    if (!modelId) {
      throw new CopilotPromptInvalid(
        'Model ID is required for Ollama provider'
      );
    }

    const provider = this.getProvider();
    return provider(modelId);
  }

  async text(
    model: ModelConditions,
    messages: PromptMessage[],
    options?: CopilotChatOptions
  ): Promise<string> {
    await this.checkParams({ cond: model, messages, options });
    const modelInstance = this.getModel(model);

    try {
      const { text } = await generateText({
        model: modelInstance,
        messages: chatToGPTMessage(messages),
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        topP: options?.topP,
        tools: await this.getTools(options || {}, modelInstance.modelId),
        maxSteps: this.MAX_STEPS,
      });

      return text;
    } catch (e: any) {
      if (e instanceof UserFriendlyError) {
        throw e;
      }
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'text',
        message: e.message || 'Failed to generate text with Ollama',
      });
    }
  }

  async *streamText(
    model: ModelConditions,
    messages: PromptMessage[],
    options?: CopilotChatOptions
  ): AsyncIterable<string> {
    await this.checkParams({ cond: model, messages, options });
    const modelInstance = this.getModel(model);

    try {
      const result = streamText({
        model: modelInstance,
        messages: chatToGPTMessage(messages),
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        topP: options?.topP,
        tools: await this.getTools(options || {}, modelInstance.modelId),
        maxSteps: this.MAX_STEPS,
      });

      yield* TextStreamParser(result);
    } catch (e: any) {
      if (e instanceof UserFriendlyError) {
        throw e;
      }
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'text',
        message: e.message || 'Failed to stream text with Ollama',
      });
    }
  }

  override async structure(
    model: ModelConditions,
    messages: PromptMessage[],
    options?: CopilotStructuredOptions
  ): Promise<string> {
    await this.checkParams({ cond: model, messages, options });
    const modelInstance = this.getModel(model);

    if (!options?.schema) {
      throw new CopilotPromptInvalid(
        'Schema is required for structured output'
      );
    }

    try {
      const { object } = await generateObject({
        model: modelInstance,
        messages: chatToGPTMessage(messages),
        schema: z.object(options.schema),
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        topP: options?.topP,
      });

      return JSON.stringify(object);
    } catch (e: any) {
      if (e instanceof UserFriendlyError) {
        throw e;
      }
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'structure',
        message:
          e.message || 'Failed to generate structured output with Ollama',
      });
    }
  }

  override async embedding(
    model: ModelConditions,
    text: string | string[],
    options?: CopilotEmbeddingOptions
  ): Promise<number[][]> {
    await this.checkParams({
      cond: model,
      embeddings: Array.isArray(text) ? text : [text],
    });

    // Use a specific embedding model if available
    const embedModel =
      typeof model === 'string' ? model : model.modelId || 'nomic-embed-text';

    const modelInstance = this.getModel(embedModel);
    const texts = Array.isArray(text) ? text : [text];

    try {
      const { embeddings } = await embedMany({
        model: modelInstance,
        values: texts,
      });

      return embeddings;
    } catch (e: any) {
      if (e instanceof UserFriendlyError) {
        throw e;
      }
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'embedding',
        message: e.message || 'Failed to generate embeddings with Ollama',
      });
    }
  }

  override async refreshOnlineModels() {
    try {
      // Try to fetch available models from Ollama API
      const baseURL = this.config.baseURL || 'http://localhost:11434';
      const response = await fetch(`${baseURL}/api/tags`);

      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          this.onlineModelList = data.models.map((m: any) => m.name);
          this.logger.log(
            `Fetched ${this.onlineModelList.length} models from Ollama`
          );
        }
      }
    } catch (e) {
      this.logger.warn(
        'Failed to fetch Ollama models, using configured models',
        e
      );
    }
  }
}
