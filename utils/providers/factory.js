// AI Provider Factory
import { GeminiProvider } from './gemini.js';
import { LMStudioProvider } from './lmstudio.js';
import { OllamaProvider } from './ollama.js';
import { ConfigurationError } from '../error/index.js';
import { config } from '../config/index.js';
import { getFromStorage } from '../storage.js';
import { getStorageKey } from '../config/index.js';

/**
 * Factory class for creating AI provider instances
 */
export class AIProviderFactory {
  /**
   * Creates and returns an instance of the appropriate AI provider
   * @param {string} providerName - Name of the provider ('gemini', 'lmstudio', 'ollama')
   * @param {object} options - Provider-specific options
   * @returns {Promise<AIProvider>} Instance of the requested provider
   * @throws {ConfigurationError} If provider is unknown or configuration is invalid
   */
  static async createProvider(providerName, options = {}) {
    switch (providerName.toLowerCase()) {
      case 'gemini':
        return await this.createGeminiProvider(options);
      
      case 'lmstudio':
        return await this.createLMStudioProvider(options);
      
      case 'ollama':
        return await this.createOllamaProvider(options);
      
      default:
        throw new ConfigurationError(
          `Unknown AI provider: ${providerName}. Supported providers: gemini, lmstudio, ollama`,
          'aiProvider'
        );
    }
  }

  /**
   * Creates a Gemini provider instance
   * @param {object} options - Options containing apiKey
   * @returns {Promise<GeminiProvider>} Gemini provider instance
   */
  static async createGeminiProvider(options) {
    let apiKey = options.apiKey;
    
    // If no API key provided, try to get from storage
    if (!apiKey) {
      const apiKeyStorageKey = getStorageKey('apiKey');
      const result = await chrome.storage.local.get([apiKeyStorageKey]);
      apiKey = result[apiKeyStorageKey];
    }

    if (!apiKey) {
      throw new ConfigurationError(
        'API key not set. Please configure it in the extension settings.',
        'apiKey'
      );
    }

    return new GeminiProvider(apiKey);
  }

  /**
   * Creates an LM Studio provider instance
   * @param {object} options - Options containing host and port
   * @returns {Promise<LMStudioProvider>} LM Studio provider instance
   */
  static async createLMStudioProvider(options) {
    const host = options.host || 
      await getFromStorage(getStorageKey('lmstudioHost')) || 
      config.get('api.lmstudio.host');
    
    const port = options.port || 
      await getFromStorage(getStorageKey('lmstudioPort')) || 
      config.get('api.lmstudio.port');

    return new LMStudioProvider(host, port);
  }

  /**
   * Creates an Ollama provider instance
   * @param {object} options - Options containing host and port
   * @returns {Promise<OllamaProvider>} Ollama provider instance
   */
  static async createOllamaProvider(options) {
    const host = options.host || 
      await getFromStorage(getStorageKey('ollamaHost')) || 
      config.get('api.ollama.host');
    
    const port = options.port || 
      await getFromStorage(getStorageKey('ollamaPort')) || 
      config.get('api.ollama.port');

    return new OllamaProvider(host, port);
  }

  /**
   * Gets the currently configured AI provider from storage
   * @returns {Promise<string>} The selected provider name
   */
  static async getCurrentProvider() {
    return await getFromStorage(getStorageKey('aiProvider')) || 
      config.get('api.defaultProvider');
  }

  /**
   * Creates an instance of the currently configured AI provider
   * @param {object} options - Provider-specific options
   * @returns {Promise<AIProvider>} Instance of the current provider
   */
  static async createCurrentProvider(options = {}) {
    const providerName = await this.getCurrentProvider();
    return this.createProvider(providerName, options);
  }
} 