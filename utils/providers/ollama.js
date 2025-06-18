// Ollama provider implementation
import { AIProvider } from './base.js';
import { APIError, NetworkError } from '../error/index.js';

/**
 * Ollama AI provider implementation
 */
export class OllamaProvider extends AIProvider {
  constructor(host, port) {
    super('Ollama');
    this.host = host;
    this.port = port;
  }

  /**
   * Gets the API URL for Ollama
   * @returns {string} Complete API URL
   */
  getApiUrl() {
    return `http://${this.host}:${this.port}/api/generate`;
  }

  /**
   * Prepares the request body for Ollama API
   * @param {string} prompt - The prompt to send
   * @returns {object} Request body for Ollama
   */
  prepareRequestBody(prompt) {
    return {
      model: this.getConfig('model', 'llama2'), // Ollama uses specified model
      prompt: prompt,
      format: 'json', // Request JSON format for easier parsing
      stream: false,
      options: {
        temperature: this.getConfig('temperature', 0.7),
        num_predict: this.getConfig('maxTokens', 2048) // Equivalent to max_tokens
      }
    };
  }

  /**
   * Makes the API call to Ollama
   * @param {string} prompt - The prompt to send
   * @returns {Promise<object>} Raw API response
   * @throws {APIError|NetworkError} If the API call fails
   */
  async makeRequest(prompt) {
    const apiUrl = this.getApiUrl();
    const requestBody = this.prepareRequestBody(prompt);

    this.logger.debug(`🔌 Calling Ollama API at ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If error response isn't JSON, use the status text
        }
        throw new APIError(errorMessage, 'ollama', response.status);
      }

      return response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new NetworkError(
          `Cannot connect to Ollama at ${apiUrl}. Please ensure Ollama is running and accessible.`,
          apiUrl,
          'POST'
        );
      }
      throw error;
    }
  }

  /**
   * Parses the Ollama API response
   * @param {object} data - Raw response from Ollama
   * @returns {Array} Parsed folder suggestions
   * @throws {APIError} If response parsing fails
   */
  parseResponse(data) {
    if (!data.response) {
      throw new APIError('Invalid response format or no content returned.', 'ollama');
    }

    const rawResponse = data.response.trim();
    this.logger.debug('Ollama raw response:', { response: rawResponse });

    try {
      return this.extractJsonArray(rawResponse);
    } catch (error) {
      throw new APIError(`Failed to parse Ollama response: ${error.message}`, 'ollama');
    }
  }
} 