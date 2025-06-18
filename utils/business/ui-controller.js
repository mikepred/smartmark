// UI Controller for coordinating business logic and UI
import { displayMessage, clearMessage, toggleButtonState } from '../ui.js';
import { handleError } from '../error.js';
import { config } from '../config/index.js';
import { logger } from '../error/index.js';
import { BookmarkClassifier } from './bookmark-classifier.js';
import { SuggestionManager } from './suggestion-manager.js';
import { BookmarkSaver } from './bookmark-saver.js';
import { MigrationController } from './migration-controller.js';
import { parseCategoryPath } from '../bookmark.js';

/**
 * Controller that coordinates between business logic and UI
 */
export class UIController {
  constructor() {
    // Business logic modules
    this.classifier = new BookmarkClassifier();
    this.suggestionManager = new SuggestionManager();
    this.bookmarkSaver = new BookmarkSaver();
    this.migrationController = new MigrationController();

    // UI elements (will be set via init)
    this.elements = {};

    // Set up observers
    this.suggestionManager.addObserver(this.handleSuggestionEvent.bind(this));
  }

  /**
   * Initializes the controller with UI elements
   * @param {object} elements - UI element references
   */
  init(elements) {
    this.elements = elements;
    this.attachEventListeners();
    logger.info('UI Controller initialized');
  }

  /**
   * Attaches event listeners to UI elements
   */
  attachEventListeners() {
    if (this.elements.classifyBtn) {
      this.elements.classifyBtn.addEventListener('click', () => this.handleClassify());
    }

    if (this.elements.saveBookmarkBtn) {
      this.elements.saveBookmarkBtn.addEventListener('click', () => this.handleSave());
    }

    if (this.elements.migrationBtn) {
      this.elements.migrationBtn.addEventListener('click', () => this.handleMigration());
    }
  }

  /**
   * Handles classification button click
   */
  async handleClassify() {
    try {
      // Update UI state
      this.setClassifying(true);
      this.clearSuggestions();
      this.hideSaveButton();

      // Perform classification
      const result = await this.classifier.classify();

      if (result.success) {
        if (result.suggestions && result.suggestions.length > 0) {
          // Update suggestions
          this.suggestionManager.updateSuggestions(result.suggestions, result.metadata);
          this.renderSuggestions();
          this.showMessage('Select a folder and click Save.');
          this.showSaveButton();
        } else {
          this.showMessage('No folder suggestions available.', true);
        }
      } else {
        this.showMessage(`Error: ${result.error}`, true);
      }
    } catch (error) {
      const errorMessage = handleError('Classification', error);
      this.showMessage(errorMessage, true);
    } finally {
      this.setClassifying(false);
    }
  }

  /**
   * Handles save button click
   */
  async handleSave() {
    const saveData = this.suggestionManager.getSaveData();
    
    if (!saveData) {
      this.showMessage('Please select a folder.', true);
      return;
    }

    try {
      // Update UI state
      this.setSaving(true);

      // Save bookmark
      const result = await this.bookmarkSaver.saveBookmark(
        saveData.folderPath,
        saveData.metadata
      );

      if (result.success) {
        this.showMessage(`Bookmark saved to: ${saveData.folderPath}`);
        this.clearSuggestions();
        this.hideSaveButton();
        this.suggestionManager.clear();
      } else {
        this.showMessage(`Error: ${result.error}`, true);
      }
    } catch (error) {
      const errorMessage = handleError('Save', error);
      this.showMessage(errorMessage, true);
    } finally {
      this.setSaving(false);
    }
  }

  /**
   * Handles migration button click
   */
  async handleMigration() {
    if (!this.elements.migrationContainer) {
      this.showMessage('Migration container not found.', true);
      return;
    }

    try {
      // Update UI state
      this.setMigrating(true);

      // Start migration workflow
      const result = await this.migrationController.startMigration(this.elements.migrationContainer);
      
      if (result.error) {
        this.showMessage(`Migration error: ${result.error}`, true);
      } else if (result.phase === 'complete' && result.proposals === 0) {
        // No proposals found - show success message and clear container after delay
        setTimeout(() => {
          this.elements.migrationContainer.innerHTML = '';
        }, 3000);
      }
      // If result.phase === 'review', the UI is already showing the review interface
      
    } catch (error) {
      const errorMessage = handleError('Migration', error);
      this.showMessage(errorMessage, true);
    } finally {
      this.setMigrating(false);
    }
  }

  /**
   * Handles suggestion manager events
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  handleSuggestionEvent(event, data) {
    switch (event) {
      case 'folderSelected':
        logger.debug(`Folder selected: ${data.folderPath}`);
        break;
      case 'suggestionsUpdated':
        logger.debug(`Suggestions updated: ${data.suggestions.length} items`);
        break;
      case 'suggestionsCleared':
        logger.debug('Suggestions cleared');
        break;
    }
  }

  /**
   * Renders suggestions in the UI
   */
  renderSuggestions() {
    const container = this.elements.suggestionsContainer;
    if (!container) return;

    container.innerHTML = '';
    const suggestions = this.suggestionManager.suggestions;

    suggestions.forEach((suggestion, idx) => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'folderSuggestion';
      radio.value = suggestion.folderPath;
      radio.id = `suggestion_${idx}`;
      radio.style.marginRight = '0.5em';
      
      // Set checked state
      if (suggestion.folderPath === this.suggestionManager.selectedFolderPath) {
        radio.checked = true;
      }

      radio.addEventListener('change', () => {
        this.suggestionManager.selectFolder(suggestion.folderPath);
      });

      const pathParts = parseCategoryPath(suggestion.folderPath);
      const displayPath = pathParts.join(' > ');
      const label = document.createElement('label');
      label.htmlFor = radio.id;
      label.textContent = `${displayPath} (${Math.round(suggestion.confidence * 100)}%)`;
      
      const div = document.createElement('div');
      div.style.textAlign = 'left';
      div.appendChild(radio);
      div.appendChild(label);
      
      container.appendChild(div);
    });
  }

  /**
   * UI Helper Methods
   */

  setClassifying(isClassifying) {
    if (this.elements.classifyBtn) {
      toggleButtonState(
        this.elements.classifyBtn,
        isClassifying,
        isClassifying ? 'Classifying...' : 'Classify Bookmark'
      );
    }
  }

  setSaving(isSaving) {
    if (this.elements.saveBookmarkBtn) {
      toggleButtonState(
        this.elements.saveBookmarkBtn,
        isSaving,
        isSaving ? 'Saving...' : 'Save Bookmark'
      );
    }
  }

  setMigrating(isMigrating) {
    if (this.elements.migrationBtn) {
      toggleButtonState(
        this.elements.migrationBtn,
        isMigrating,
        isMigrating ? 'Analyzing...' : 'Organize Existing Bookmarks'
      );
    }
  }

  showMessage(message, isError = false) {
    if (this.elements.messageDiv) {
      displayMessage(this.elements.messageDiv, message, isError);
      if (!isError) {
        clearMessage(this.elements.messageDiv, config.get('ui.messageTimeout'));
      }
    }
  }

  clearSuggestions() {
    if (this.elements.suggestionsContainer) {
      this.elements.suggestionsContainer.innerHTML = '';
    }
  }

  showSaveButton() {
    if (this.elements.saveBookmarkBtn) {
      this.elements.saveBookmarkBtn.style.display = 'block';
    }
  }

  hideSaveButton() {
    if (this.elements.saveBookmarkBtn) {
      this.elements.saveBookmarkBtn.style.display = 'none';
    }
  }
} 