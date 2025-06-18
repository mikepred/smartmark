// LM Studio provider implementation
import { AIProvider } from './base.js';
import { APIError, NetworkError } from '../error/index.js';

/**
 * LM Studio AI provider implementation
 */
export class LMStudioProvider extends AIProvider {
  constructor(host, port) {
    super('LMStudio');
    this.host = host;
    this.port = port;
  }

  /**
   * Gets the API URL for LM Studio
   * @returns {string} Complete API URL
   */
  getApiUrl() {
    return `http://${this.host}:${this.port}/v1/chat/completions`;
  }

  /**
   * Prepares the request body for LM Studio API
   * @param {string} prompt - The prompt to send
   * @returns {object} Request body for LM Studio
   */
  prepareRequestBody(prompt) {
    return {
      model: this.getConfig('model', 'loaded-model'), // LM Studio uses whatever model is loaded
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: this.getConfig('temperature', 0.7),
      max_tokens: this.getConfig('maxTokens', 2048),
      stream: false
    };
  }

  /**
   * Makes the API call to LM Studio
   * @param {string} prompt - The prompt to send
   * @returns {Promise<object>} Raw API response
   * @throws {APIError|NetworkError} If the API call fails
   */
  async makeRequest(prompt) {
    const apiUrl = this.getApiUrl();
    const requestBody = this.prepareRequestBody(prompt);

    this.logger.debug(`🔌 Calling LM Studio API at ${apiUrl}`);

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
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // If error response isn't JSON, use the status text
        }
        throw new APIError(errorMessage, 'lmstudio', response.status);
      }

      return response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new NetworkError(
          `Cannot connect to LM Studio at ${apiUrl}. Please ensure LM Studio is running and accessible.`,
          apiUrl,
          'POST'
        );
      }
      throw error;
    }
  }

  /**
   * Parses the LM Studio API response
   * @param {object} data - Raw response from LM Studio
   * @returns {Array} Parsed folder suggestions
   * @throws {APIError} If response parsing fails
   */
  parseResponse(data) {
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new APIError('Invalid response format or no content returned.', 'lmstudio');
    }

    const rawResponse = data.choices[0].message.content.trim();
    this.logger.debug('LM Studio raw response:', { response: rawResponse });

    try {
      return this.extractJsonArray(rawResponse);
    } catch (error) {
      throw new APIError(`Failed to parse LM Studio response: ${error.message}`, 'lmstudio');
    }
  }
} 