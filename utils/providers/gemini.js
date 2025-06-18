// Gemini provider implementation
import { AIProvider } from './base.js';
import { APIError, ConfigurationError } from '../error/index.js';

/**
 * Google Gemini AI provider implementation
 */
export class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super('Gemini');
    this.apiKey = apiKey;
  }

  /**
   * Validates that the API key is provided
   * @throws {ConfigurationError} If API key is missing
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new ConfigurationError('API key is required for Gemini provider', 'apiKey');
    }
  }

  /**
   * Prepares the request body for Gemini API
   * @param {string} prompt - The prompt to send
   * @returns {object} Request body for Gemini
   */
  prepareRequestBody(prompt) {
    return {
      contents: [{ 
        parts: [{ text: prompt }] 
      }],
      generationConfig: {
        temperature: this.getConfig('temperature', 0.7),
        maxOutputTokens: this.getConfig('maxOutputTokens', 2048)
      }
    };
  }

  /**
   * Makes the API call to Gemini
   * @param {string} prompt - The prompt to send
   * @returns {Promise<object>} Raw API response
   * @throws {APIError} If the API call fails
   */
  async makeRequest(prompt) {
    const url = this.getConfig('url');
    const requestBody = this.prepareRequestBody(prompt);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown error';
      throw new APIError(`Gemini API Error: ${errorMessage}`, 'gemini', response.status);
    }

    return response.json();
  }

  /**
   * Parses the Gemini API response
   * @param {object} data - Raw response from Gemini
   * @returns {Array} Parsed folder suggestions
   * @throws {APIError} If response parsing fails
   */
  parseResponse(data) {
    if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
      throw new APIError('The request was blocked due to safety concerns.', 'gemini');
    }

    if (!data.candidates || !data.candidates[0].content) {
      throw new APIError('Invalid response format or no content returned.', 'gemini');
    }

    const rawResponse = data.candidates[0].content.parts[0].text.trim();
    this.logger.debug('Gemini raw response:', { response: rawResponse });

    try {
      return this.extractJsonArray(rawResponse);
    } catch (error) {
      throw new APIError(`Failed to parse Gemini response: ${error.message}`, 'gemini');
    }
  }
} 