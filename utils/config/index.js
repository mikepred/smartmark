/**
 * Centralized configuration management for SmartMark extension
 * Provides a single source of truth for all configuration values
 */

// Configuration schema definition
const CONFIG_SCHEMA = {
  // API Provider Configuration
  api: {
    gemini: {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      maxOutputTokens: 200,
      temperature: 0.7
    },
    lmstudio: {
      host: 'localhost',
      port: '1234',
      model: 'gemma-3-1b',
      maxTokens: 200,
      temperature: 0.7
    },
    ollama: {
      host: 'localhost', 
      port: '11434',
      model: 'gemma3:4b',
      maxTokens: 200,
      temperature: 0.7
    },
    // Token management
    tokenLimits: {
      maxPromptTokens: 900000,
      maxResponseTokens: 200,
      contextBufferTokens: 50000,
      maxContextTokens: 50000
    },
    // Default provider
    defaultProvider: 'gemini'
  },
  
  // Storage Configuration
  storage: {
    keys: {
      apiKey: 'apiKey',
      aiProvider: 'aiProvider',
      lmstudioHost: 'lmstudioHost',
      lmstudioPort: 'lmstudioPort',
      ollamaHost: 'ollamaHost',
      ollamaPort: 'ollamaPort',
      bookmarkCache: 'bookmarkFolderCache',
      cacheTimestamp: 'bookmarkCacheTimestamp'
    },
    cache: {
      ttl: 3600000 // 1 hour in milliseconds
    }
  },
  
  // UI Configuration
  ui: {
    defaultSuggestionCount: 5,
    messageTimeout: 1000,
    metadataTimeout: 10000
  },
  
  // Extension Configuration
  extension: {
    name: 'SmartMark',
    version: '1.0.0',
    fallbackFolder: 'Uncategorized'
  },
  
  // Feature Flags
  features: {
    enableCaching: true,
    enableLogging: true,
    enableAnalytics: false
  },
  
  // Development Configuration
  development: {
    debug: false,
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  }
};

// Configuration instance (singleton)
let configInstance = null;

/**
 * Configuration class with validation and accessor methods
 */
class Config {
  constructor() {
    if (configInstance) {
      return configInstance;
    }
    
    this.config = this.loadConfiguration();
    configInstance = this;
  }
  
  /**
   * Load configuration with environment overrides
   */
  loadConfiguration() {
    // Deep clone the schema
    const config = JSON.parse(JSON.stringify(CONFIG_SCHEMA));
    
    // Apply environment-specific overrides if available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // In extension environment, could load from storage
      this.applyStoredOverrides(config);
    }
    
    // Apply any runtime overrides
    this.applyRuntimeOverrides(config);
    
    return config;
  }
  
  /**
   * Apply stored configuration overrides
   */
  async applyStoredOverrides(config) {
    try {
      const stored = await chrome.storage.local.get(['configOverrides']);
      if (stored.configOverrides) {
        this.deepMerge(config, stored.configOverrides);
      }
    } catch (error) {
      console.warn('Failed to load stored configuration overrides:', error);
    }
  }
  
  /**
   * Apply runtime overrides (e.g., from environment variables in development)
   */
  applyRuntimeOverrides(config) {
    // In development, could read from process.env
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.DEBUG === 'true') {
        config.development.debug = true;
      }
      if (process.env.LOG_LEVEL) {
        config.development.logLevel = process.env.LOG_LEVEL;
      }
    }
  }
  
  /**
   * Deep merge utility for configuration objects
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
  
  /**
   * Get a configuration value by path
   * @param {string} path - Dot-notation path (e.g., 'api.gemini.url')
   * @returns {*} The configuration value
   */
  get(path) {
    const parts = path.split('.');
    let value = this.config;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * Set a configuration value by path
   * @param {string} path - Dot-notation path
   * @param {*} value - The value to set
   */
  set(path, value) {
    const parts = path.split('.');
    let target = this.config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in target) || typeof target[part] !== 'object') {
        target[part] = {};
      }
      target = target[part];
    }
    
    target[parts[parts.length - 1]] = value;
  }
  
  /**
   * Get all configuration
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }
  
  /**
   * Validate configuration against schema
   */
  validate() {
    // TODO: Implement schema validation
    return true;
  }
  
  /**
   * Save configuration overrides to storage
   */
  async saveOverrides(overrides) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ configOverrides: overrides });
    }
  }
  
  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = JSON.parse(JSON.stringify(CONFIG_SCHEMA));
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['configOverrides']);
    }
  }
}

// Export singleton instance
export const config = new Config();

// Export specific configuration sections for convenience
export const getApiConfig = () => config.get('api');
export const getStorageConfig = () => config.get('storage');
export const getUIConfig = () => config.get('ui');
export const getFeatureFlags = () => config.get('features');

// Export utility functions
export const isDebugMode = () => config.get('development.debug');
export const getLogLevel = () => config.get('development.logLevel');
export const getStorageKey = (key) => config.get(`storage.keys.${key}`);
export const getApiUrl = (provider) => config.get(`api.${provider}.url`);

// Export for testing
export const CONFIG_DEFAULTS = CONFIG_SCHEMA;

// Export migration utilities
export { migrateSettings, isMigrationNeeded, rollbackMigration } from './migration.js'; 