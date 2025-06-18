// Base provider class for AI providers
import { APIError, ConfigurationError, NetworkError, logger } from '../error/index.js';
import { config } from '../config/index.js';

/**
 * Base class for AI providers
 * All provider implementations should extend this class
 */
export class AIProvider {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Validates provider configuration
   * @throws {ConfigurationError} If configuration is invalid
   */
  validateConfig() {
    // Base implementation - override in subclasses as needed
    return true;
  }

  /**
   * Prepares the request body for the API call
   * @param {string} prompt - The prompt to send to the AI
   * @returns {object} Request body formatted for the specific provider
   */
  prepareRequestBody(prompt) {
    throw new Error(`Provider ${this.name} must implement prepareRequestBody method`);
  }

  /**
   * Makes the API call to the provider
   * @param {string} prompt - The prompt to send to the AI
   * @returns {Promise<Array>} Parsed folder suggestions
   */
  async makeRequest(prompt) {
    throw new Error(`Provider ${this.name} must implement makeRequest method`);
  }

  /**
   * Extracts and parses the JSON response from the provider
   * @param {object} data - Raw response data from the API
   * @returns {Array} Parsed folder suggestions
   * @throws {APIError} If response parsing fails
   */
  parseResponse(data) {
    throw new Error(`Provider ${this.name} must implement parseResponse method`);
  }

  /**
   * Main method to get folder suggestions
   * @param {string} prompt - The prompt to send to the AI
   * @returns {Promise<Array>} Folder suggestions
   */
  async getFolderSuggestions(prompt) {
    this.validateConfig();
    
    this.logger.debug(`📤 Calling ${this.name} API`);
    
    try {
      const response = await this.makeRequest(prompt);
      const suggestions = this.parseResponse(response);
      
      if (!Array.isArray(suggestions)) {
        throw new APIError(`${this.name} did not return an array of suggestions`, this.name);
      }
      
      this.logger.debug(`✅ ${this.name} returned ${suggestions.length} suggestions`);
      return suggestions;
      
    } catch (error) {
      if (error instanceof APIError || error instanceof NetworkError) {
        throw error;
      }
      
      this.logger.error(`❌ ${this.name} API error:`, error);
      throw new APIError(`${this.name} API call failed: ${error.message}`, this.name);
    }
  }

  /**
   * Helper method to extract JSON array from a text response
   * @param {string} rawResponse - Raw text response that may contain JSON
   * @returns {Array} Parsed JSON array
   * @throws {Error} If JSON parsing fails
   */
  extractJsonArray(rawResponse) {
    let jsonText = rawResponse.trim();
    
    // If not valid JSON, try to extract the first JSON array
    if (!jsonText.startsWith('[')) {
      const firstBracket = jsonText.indexOf('[');
      const lastBracket = jsonText.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonText = jsonText.substring(firstBracket, lastBracket + 1);
      }
    }
    
    try {
      const suggestions = JSON.parse(jsonText);
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }
      return suggestions;
    } catch (e) {
      throw new Error(`Failed to parse JSON array: ${e.message}\nRaw response: ${rawResponse}`);
    }
  }

  /**
   * Get provider-specific configuration
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  getConfig(key, defaultValue = null) {
    const path = `api.${this.name.toLowerCase()}.${key}`;
    return config.get(path, defaultValue);
  }
} 