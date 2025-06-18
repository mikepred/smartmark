// Suggestion management business logic
import { logger } from '../error/index.js';

/**
 * Manages bookmark suggestions state and selection
 */
export class SuggestionManager {
  constructor() {
    this.suggestions = [];
    this.metadata = null;
    this.selectedFolderPath = null;
    this.observers = [];
  }

  /**
   * Updates suggestions and metadata
   * @param {Array} suggestions - Array of folder suggestions
   * @param {object} metadata - Bookmark metadata
   */
  updateSuggestions(suggestions, metadata) {
    this.suggestions = suggestions || [];
    this.metadata = metadata;
    
    // Auto-select first suggestion if available
    if (this.suggestions.length > 0) {
      this.selectFolder(this.suggestions[0].folderPath);
    } else {
      this.selectedFolderPath = null;
    }

    logger.info(`Updated suggestions: ${this.suggestions.length} items`);
    this.notifyObservers('suggestionsUpdated', { suggestions: this.suggestions, metadata: this.metadata });
  }

  /**
   * Selects a folder path
   * @param {string} folderPath - The folder path to select
   * @returns {boolean} True if selection was successful
   */
  selectFolder(folderPath) {
    const suggestion = this.suggestions.find(s => s.folderPath === folderPath);
    
    if (!suggestion) {
      logger.warn(`Folder path not found in suggestions: ${folderPath}`);
      return false;
    }

    this.selectedFolderPath = folderPath;
    logger.info(`Selected folder: ${folderPath}`);
    this.notifyObservers('folderSelected', { folderPath, suggestion });
    return true;
  }

  /**
   * Gets the currently selected suggestion
   * @returns {object|null} The selected suggestion or null
   */
  getSelectedSuggestion() {
    if (!this.selectedFolderPath) return null;
    return this.suggestions.find(s => s.folderPath === this.selectedFolderPath);
  }

  /**
   * Gets suggestion by index
   * @param {number} index - The suggestion index
   * @returns {object|null} The suggestion or null
   */
  getSuggestionByIndex(index) {
    return this.suggestions[index] || null;
  }

  /**
   * Clears all suggestions and selection
   */
  clear() {
    this.suggestions = [];
    this.metadata = null;
    this.selectedFolderPath = null;
    logger.info('Cleared all suggestions');
    this.notifyObservers('suggestionsCleared');
  }

  /**
   * Checks if ready to save (has selection and metadata)
   * @returns {boolean} True if ready to save
   */
  isReadyToSave() {
    return !!(this.selectedFolderPath && this.metadata);
  }

  /**
   * Gets save data for the selected bookmark
   * @returns {object|null} Save data or null if not ready
   */
  getSaveData() {
    if (!this.isReadyToSave()) {
      logger.warn('Not ready to save: missing selection or metadata');
      return null;
    }

    return {
      folderPath: this.selectedFolderPath,
      metadata: this.metadata,
      suggestion: this.getSelectedSuggestion()
    };
  }

  /**
   * Adds an observer for state changes
   * @param {Function} observer - Observer function to call on state changes
   */
  addObserver(observer) {
    this.observers.push(observer);
  }

  /**
   * Removes an observer
   * @param {Function} observer - Observer function to remove
   */
  removeObserver(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Notifies all observers of a state change
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  notifyObservers(event, data = {}) {
    this.observers.forEach(observer => {
      try {
        observer(event, data);
      } catch (error) {
        logger.error('Observer error:', error);
      }
    });
  }
} 