// settings.js - Complete implementation
import { getConfig, saveConfig, saveSecure } from './lib/storage.js';

function updateVisibility() {
  const provider = document.getElementById('provider').value;
  const providers = ['gemini', 'lmstudio', 'openai', 'anthropic', 'openrouter', 'together', 'perplexity', 'groq', 'mistral', 'cohere'];
  
  providers.forEach(p => {
    const element = document.getElementById(`${p}Settings`);
    if (element) {
      element.style.display = provider === p ? 'block' : 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const config = await getConfig();
  
  // Load current settings
  document.getElementById('provider').value = config.provider;
  
  // Load provider-specific settings
  const fields = {
    apiKey: config.apiKey,
    host: config.host,
    port: config.port,
    model: config.model,
    openaiApiKey: config.openaiApiKey,
    openaiModel: config.openaiModel,
    anthropicApiKey: config.anthropicApiKey,
    anthropicModel: config.anthropicModel,
    openrouterApiKey: config.openrouterApiKey,
    openrouterModel: config.openrouterModel,
    togetherApiKey: config.togetherApiKey,
    togetherModel: config.togetherModel,
    perplexityApiKey: config.perplexityApiKey,
    perplexityModel: config.perplexityModel,
    groqApiKey: config.groqApiKey,
    groqModel: config.groqModel,
    mistralApiKey: config.mistralApiKey,
    mistralModel: config.mistralModel,
    cohereApiKey: config.cohereApiKey,
    cohereModel: config.cohereModel
  };
  
  Object.entries(fields).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element && value) {
      element.value = value;
    }
  });
  
  updateVisibility();
  
  document.getElementById('provider').addEventListener('change', updateVisibility);
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
});

async function saveSettings() {
  const statusEl = document.getElementById('status');
  
  try {
    const getValue = (id) => {
      const element = document.getElementById(id);
      return element ? element.value : '';
    };
    
    const config = {
      provider: getValue('provider'),
      // Gemini
      apiKey: getValue('apiKey'),
      // LM Studio
      host: getValue('host'),
      port: parseInt(getValue('port')) || 1234,
      model: getValue('model'),
      // OpenAI
      openaiApiKey: getValue('openaiApiKey'),
      openaiModel: getValue('openaiModel') || 'gpt-4o-mini',
      // Anthropic
      anthropicApiKey: getValue('anthropicApiKey'),
      anthropicModel: getValue('anthropicModel') || 'claude-3-haiku-20240307',
      // OpenRouter
      openrouterApiKey: getValue('openrouterApiKey'),
      openrouterModel: getValue('openrouterModel') || 'anthropic/claude-3-haiku',
      // Together AI
      togetherApiKey: getValue('togetherApiKey'),
      togetherModel: getValue('togetherModel') || 'meta-llama/Llama-3-8b-chat-hf',
      // Perplexity
      perplexityApiKey: getValue('perplexityApiKey'),
      perplexityModel: getValue('perplexityModel') || 'llama-3.1-sonar-small-128k-chat',
      // Groq
      groqApiKey: getValue('groqApiKey'),
      groqModel: getValue('groqModel') || 'llama-3.1-8b-instant',
      // Mistral
      mistralApiKey: getValue('mistralApiKey'),
      mistralModel: getValue('mistralModel') || 'mistral-small-latest',
      // Cohere
      cohereApiKey: getValue('cohereApiKey'),
      cohereModel: getValue('cohereModel') || 'command-r'
    };
    
    // Basic validation - check if API key is provided for the selected provider
    const provider = config.provider;
    const requiresApiKey = ['gemini', 'openai', 'anthropic', 'openrouter', 'together', 'perplexity', 'groq', 'mistral', 'cohere'];
    
    if (requiresApiKey.includes(provider)) {
      const apiKeyField = provider === 'gemini' ? 'apiKey' : `${provider}ApiKey`;
      if (!config[apiKeyField]) {
        throw new Error(`API key required for ${provider}`);
      }
    }
    
    // Save API keys securely
    const apiKeyMappings = {
      gemini: 'gemini_key',
      openai: 'openai_key',
      anthropic: 'anthropic_key',
      openrouter: 'openrouter_key',
      together: 'together_key',
      perplexity: 'perplexity_key',
      groq: 'groq_key',
      mistral: 'mistral_key',
      cohere: 'cohere_key'
    };
    
    if (apiKeyMappings[provider]) {
      const apiKeyField = provider === 'gemini' ? 'apiKey' : `${provider}ApiKey`;
      const apiKey = config[apiKeyField];
      if (apiKey) {
        await saveSecure(apiKeyMappings[provider], apiKey);
      }
    }
    
    await saveConfig(config);
    
    statusEl.textContent = 'Settings saved';
    statusEl.style.color = '#2e7d32';
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.style.color = '#d32f2f';
  }
}
