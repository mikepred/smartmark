// Bookmark saving business logic
import { checkRuntimeError } from '../error.js';
import { logger } from '../error/index.js';

/**
 * Handles bookmark saving business logic
 */
export class BookmarkSaver {
  constructor() {
    this.isSaving = false;
  }

  /**
   * Saves a bookmark with the specified folder and metadata
   * @param {string} folderPath - The folder path to save to
   * @param {object} metadata - The bookmark metadata
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveBookmark(folderPath, metadata) {
    if (this.isSaving) {
      logger.warn('Save already in progress');
      return { success: false, error: 'Save already in progress' };
    }

    if (!folderPath || !metadata) {
      logger.error('Invalid save parameters', { folderPath, metadata });
      return { success: false, error: 'Missing folder path or metadata' };
    }

    this.isSaving = true;
    logger.info(`Saving bookmark to: ${folderPath}`);

    try {
      const response = await this.sendSaveRequest(folderPath, metadata);
      
      // Check for runtime errors
      const runtimeError = checkRuntimeError();
      if (runtimeError) {
        logger.error('Runtime error during save:', runtimeError);
        return { success: false, error: runtimeError };
      }

      // Validate response
      if (!response) {
        return { success: false, error: 'No response from save service' };
      }

      if (response.success) {
        logger.info(`Bookmark saved successfully to: ${folderPath}`);
        return { success: true };
      } else {
        logger.error('Save failed:', response.error);
        return { success: false, error: response.error || 'Unknown error' };
      }
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Sends save request to background script
   * @param {string} folderPath - The folder path
   * @param {object} metadata - The bookmark metadata
   * @returns {Promise<object>} Response from background script
   */
  sendSaveRequest(folderPath, metadata) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'saveBookmarkWithFolder',
        folderPath: folderPath,
        metadata: metadata
      }, (response) => {
        resolve(response);
      });
    });
  }

  /**
   * Validates save data before saving
   * @param {object} saveData - The save data to validate
   * @returns {object} Validation result
   */
  validateSaveData(saveData) {
    const errors = [];

    if (!saveData) {
      errors.push('No save data provided');
    } else {
      if (!saveData.folderPath) {
        errors.push('No folder path specified');
      }
      if (!saveData.metadata) {
        errors.push('No metadata provided');
      } else {
        if (!saveData.metadata.url) {
          errors.push('No URL in metadata');
        }
        if (!saveData.metadata.title) {
          errors.push('No title in metadata');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Gets save status
   * @returns {boolean} True if currently saving
   */
  getIsSaving() {
    return this.isSaving;
  }
} 