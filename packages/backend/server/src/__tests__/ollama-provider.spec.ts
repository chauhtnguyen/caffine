import type { TestFn } from 'ava';
import ava from 'ava';

import { ServerFeature } from '../core';
import { CopilotModule } from '../plugins/copilot';
import {
  CopilotProviderFactory,
  CopilotProviderType,
  OllamaProvider,
} from '../plugins/copilot/providers';
import { createTestingModule, TestingModule } from './utils';

type Tester = {
  module: TestingModule;
  factory: CopilotProviderFactory;
};

const test = ava as TestFn<Tester>;

test.beforeEach(async t => {
  t.context.module = await createTestingModule({
    imports: [CopilotModule],
    tapModule: module => {
      module.overrideProvider(ServerFeature).useValue({
        copilot: true,
        payment: false,
      });
    },
  });

  t.context.factory = t.context.module.get(CopilotProviderFactory);
});

test.afterEach.always(async t => {
  await t.context.module.close();
});

test('Ollama provider should be available in factory', async t => {
  const { factory } = t.context;

  // Check if Ollama provider is registered
  const ollamaProvider = factory.getProvider(CopilotProviderType.Ollama);
  t.truthy(ollamaProvider);
  t.true(ollamaProvider instanceof OllamaProvider);
});

test('Ollama provider should have correct type', async t => {
  const { factory } = t.context;

  const ollamaProvider = factory.getProvider(CopilotProviderType.Ollama);
  t.is(ollamaProvider?.type, CopilotProviderType.Ollama);
});

test('Ollama provider should be configured by default', async t => {
  const { factory } = t.context;

  const ollamaProvider = factory.getProvider(CopilotProviderType.Ollama);
  t.truthy(ollamaProvider);
  // Ollama doesn't require API keys, so it should be configured by default
  t.true(ollamaProvider.configured());
});

test('Ollama provider should have default models', async t => {
  const { factory } = t.context;

  const ollamaProvider = factory.getProvider(CopilotProviderType.Ollama);
  t.truthy(ollamaProvider);

  const models = ollamaProvider.models;
  t.true(Array.isArray(models));
  t.true(models.length > 0);

  // Check if default models include common Ollama models
  const modelIds = models.map(m => m.id);
  t.true(modelIds.includes('llama3.2'));
  t.true(modelIds.includes('mistral'));
});

test('Ollama provider should match text generation conditions', async t => {
  const { factory } = t.context;

  const ollamaProvider = factory.getProvider(CopilotProviderType.Ollama);
  t.truthy(ollamaProvider);

  // Test if provider can handle text generation
  const canHandleText = await ollamaProvider.match({
    outputType: 'text',
    inputTypes: ['text'],
  });

  t.true(canHandleText);
});
