// Bookmark classification business logic
import { checkRuntimeError } from '../error.js';
import { logger } from '../error/index.js';

/**
 * Handles bookmark classification business logic
 */
export class BookmarkClassifier {
  constructor() {
    this.isClassifying = false;
  }

  /**
   * Classifies the current page
   * @returns {Promise<{success: boolean, suggestions?: Array, metadata?: object, error?: string}>}
   */
  async classify() {
    if (this.isClassifying) {
      logger.warn('Classification already in progress');
      return { success: false, error: 'Classification already in progress' };
    }

    this.isClassifying = true;
    logger.info('Starting bookmark classification');

    try {
      const response = await this.sendClassificationRequest();
      
      // Check for runtime errors
      const runtimeError = checkRuntimeError();
      if (runtimeError) {
        logger.error('Runtime error during classification:', runtimeError);
        return { success: false, error: runtimeError };
      }

      // Validate response
      if (!response) {
        return { success: false, error: 'No response from classification service' };
      }

      if (response.success) {
        if (response.suggestions && response.suggestions.length > 0) {
          logger.info(`Classification successful: ${response.suggestions.length} suggestions`);
          return {
            success: true,
            suggestions: response.suggestions,
            metadata: response.metadata
          };
        } else {
          logger.warn('Classification returned no suggestions');
          return { success: true, suggestions: [], metadata: response.metadata };
        }
      } else {
        logger.error('Classification failed:', response.error);
        return { success: false, error: response.error || 'Unknown error' };
      }
    } finally {
      this.isClassifying = false;
    }
  }

  /**
   * Sends classification request to background script
   * @returns {Promise<object>} Response from background script
   */
  sendClassificationRequest() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'classify' }, (response) => {
        resolve(response);
      });
    });
  }

  /**
   * Cancels ongoing classification if possible
   */
  cancelClassification() {
    if (this.isClassifying) {
      this.isClassifying = false;
      logger.info('Classification cancelled');
    }
  }
} 