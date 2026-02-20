import { createOpenAI } from '@ai-sdk/openai';
import {
  embedMany,
  generateObject,
  generateText,
  stepCountIs,
  streamText,
} from 'ai';

import {
  CopilotPromptInvalid,
  CopilotProviderSideError,
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

export type CLIProxyConfig = {
  baseURL?: string;
  apiKey?: string;
  models?: string[];
};

/**
 * CLIProxyAPI provider — routes requests through the locally-running
 * CLIProxyAPI service which proxies to cloud LLMs (Claude, Gemini, Codex, etc.)
 * via OAuth / API keys configured in CLIProxyAPI's own config.yaml.
 *
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 */
export class CLIProxyProvider extends CopilotProvider<CLIProxyConfig> {
  static readonly ID = 'cliproxy';
  readonly type = CopilotProviderType.CLIProxy;

  private provider?: ReturnType<typeof createOpenAI>;

  // Human-readable names for cloud models available through CLIProxyAPI
  private static readonly MODEL_NAMES: Record<string, string> = {
    'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
    'claude-opus-4-5-20251101': 'Claude Opus 4.5',
    'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gpt-4o': 'GPT 4o',
    'gpt-4o-mini': 'GPT 4o Mini',
  };

  private static modelName(id: string): string {
    return CLIProxyProvider.MODEL_NAMES[id] || `CLIProxy ${id}`;
  }

  get models(): CopilotProviderModel[] {
    const defaultModels = Object.keys(CLIProxyProvider.MODEL_NAMES);
    const configuredModels = this.config?.models || defaultModels;

    return configuredModels.map(modelId => ({
      id: modelId,
      name: CLIProxyProvider.modelName(modelId),
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
          defaultForOutputType: modelId === 'claude-sonnet-4-5-20250929',
        },
      ],
    }));
  }

  override configured() {
    return !!this.config;
  }

  private getProvider() {
    if (!this.provider) {
      const baseURL = this.config?.baseURL || 'http://localhost:3456/v1';
      const apiKey = this.config?.apiKey || '';

      this.provider = createOpenAI({
        baseURL,
        apiKey,
      });
    }
    return this.provider;
  }

  async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): Promise<string> {
    const fullCond = { ...cond, outputType: ModelOutputType.Text };
    await this.checkParams({ cond: fullCond, messages, options });
    const model = this.selectModel(fullCond);

    try {
      const [system, msgs] = await chatToGPTMessage(messages);
      const modelInstance = this.getProvider()(model.id);

      const { text } = await generateText({
        model: modelInstance,
        system,
        messages: msgs,
        temperature: options.temperature ?? 0,
        maxOutputTokens: options.maxTokens ?? 4096,
        tools: await this.getTools(options, model.id),
        stopWhen: stepCountIs(this.MAX_STEPS),
        abortSignal: options.signal,
      });

      return text.trim();
    } catch (e: any) {
      if (e instanceof UserFriendlyError) throw e;
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'text',
        message: e.message || 'Failed to generate text with CLIProxy',
      });
    }
  }

  async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    const fullCond = { ...cond, outputType: ModelOutputType.Text };
    await this.checkParams({ cond: fullCond, messages, options });
    const model = this.selectModel(fullCond);

    try {
      const [system, msgs] = await chatToGPTMessage(messages);
      const modelInstance = this.getProvider()(model.id);

      const { fullStream } = streamText({
        model: modelInstance,
        system,
        messages: msgs,
        temperature: options.temperature ?? 0,
        maxOutputTokens: options.maxTokens ?? 4096,
        tools: await this.getTools(options, model.id),
        stopWhen: stepCountIs(this.MAX_STEPS),
        abortSignal: options.signal,
      });

      const textParser = new TextStreamParser();
      for await (const chunk of fullStream) {
        switch (chunk.type) {
          case 'text-delta': {
            yield textParser.parse(chunk);
            break;
          }
          case 'finish': {
            const footnotes = textParser.end();
            if (footnotes.length) yield '\n' + footnotes;
            break;
          }
          default: {
            yield textParser.parse(chunk);
            break;
          }
        }
        if (options.signal?.aborted) {
          await fullStream.cancel();
          break;
        }
      }
    } catch (e: any) {
      if (e instanceof UserFriendlyError) throw e;
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'text',
        message: e.message || 'Failed to stream text with CLIProxy',
      });
    }
  }

  override async structure(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotStructuredOptions = {}
  ): Promise<string> {
    const fullCond = { ...cond, outputType: ModelOutputType.Text };
    await this.checkParams({ cond: fullCond, messages, options });
    const model = this.selectModel(fullCond);

    try {
      const [system, msgs, schema] = await chatToGPTMessage(messages);
      if (!schema) {
        throw new CopilotPromptInvalid('Schema is required');
      }

      const modelInstance = this.getProvider()(model.id);

      const { object } = await generateObject({
        model: modelInstance,
        system,
        messages: msgs,
        schema,
        temperature: options.temperature ?? 0,
        maxOutputTokens: options.maxTokens ?? 4096,
        abortSignal: options.signal,
      });

      return JSON.stringify(object);
    } catch (e: any) {
      if (e instanceof UserFriendlyError) throw e;
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'structure',
        message:
          e.message || 'Failed to generate structured output with CLIProxy',
      });
    }
  }

  override async embedding(
    cond: ModelConditions,
    text: string | string[],
    _options: CopilotEmbeddingOptions = { dimensions: 256 }
  ): Promise<number[][]> {
    const texts = Array.isArray(text) ? text : [text];
    const fullCond = { ...cond, outputType: ModelOutputType.Embedding };
    await this.checkParams({ embeddings: texts, cond: fullCond });

    const model = this.selectModel(fullCond);

    try {
      const modelInstance = this.getProvider().embedding(model.id);

      const { embeddings } = await embedMany({
        model: modelInstance,
        values: texts,
      });

      return embeddings.filter(v => v && Array.isArray(v));
    } catch (e: any) {
      if (e instanceof UserFriendlyError) throw e;
      throw new CopilotProviderSideError({
        provider: this.type,
        kind: 'embedding',
        message: e.message || 'Failed to generate embeddings with CLIProxy',
      });
    }
  }

  override async refreshOnlineModels() {
    try {
      const baseURL = this.config?.baseURL || 'http://localhost:3456/v1';
      const apiKey = this.config?.apiKey || '';
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseURL}/models`, { headers });

      if (response.ok) {
        const data = (await response.json()) as {
          data?: { id: string }[];
        };
        if (data.data && Array.isArray(data.data)) {
          this.onlineModelList = data.data.map(m => m.id);
          this.logger.log(
            `Fetched ${this.onlineModelList.length} models from CLIProxyAPI`
          );
        }
      }
    } catch (e) {
      this.logger.warn(
        'Failed to fetch CLIProxyAPI models, using configured models',
        e
      );
    }
  }
}
