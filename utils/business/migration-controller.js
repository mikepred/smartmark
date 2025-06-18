// Migration Controller for handling bookmark migration UI and workflow
import { performMigrationWorkflow, proposeBookmarkMoves, executeMigration } from '../migration.js';
import { parseCategoryPath } from '../bookmark.js';
import { logger } from '../error/index.js';

/**
 * Controller for bookmark migration functionality
 */
export class MigrationController {
  constructor() {
    this.currentProposals = [];
    this.selectedProposals = new Set();
    this.migrationInProgress = false;
  }

  /**
   * Starts the migration process with UI-based review
   * @param {HTMLElement} container - Container element for migration UI
   * @returns {Promise<Object>} Migration results
   */
  async startMigration(container) {
    if (this.migrationInProgress) {
      logger.warn('Migration already in progress');
      return { error: 'Migration already in progress' };
    }

    this.migrationInProgress = true;
    
    try {
      // Generate proposals
      this.showMessage(container, 'Analyzing bookmarks for migration...');
      this.currentProposals = await proposeBookmarkMoves();

      if (this.currentProposals.length === 0) {
        this.showMessage(container, 'No bookmarks need migration to hierarchical folders.');
        return {
          phase: 'complete',
          proposals: 0,
          message: 'No migration needed'
        };
      }

      // Show proposals for review
      this.renderProposalReview(container);
      return {
        phase: 'review',
        proposals: this.currentProposals.length
      };

    } catch (error) {
      logger.error('Error starting migration:', error);
      this.showMessage(container, `Error: ${error.message}`, true);
      return { error: error.message };
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Renders the proposal review UI
   * @param {HTMLElement} container - Container element
   */
  renderProposalReview(container) {
    container.innerHTML = `
      <div id="migrationReview">
        <h3>Bookmark Migration Review</h3>
        <p>Found ${this.currentProposals.length} bookmarks that could benefit from hierarchical organization:</p>
        
        <div id="proposalsList" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
          ${this.renderProposals()}
        </div>
        
        <div style="margin: 10px 0;">
          <button id="selectAllBtn" style="margin-right: 5px;">Select All</button>
          <button id="selectNoneBtn">Select None</button>
        </div>
        
        <div style="margin: 10px 0;">
          <button id="executeMigrationBtn" style="background-color: #4CAF50;">
            Migrate Selected Bookmarks (<span id="selectedCount">0</span>)
          </button>
          <button id="cancelMigrationBtn" style="background-color: #f44336; margin-left: 5px;">
            Cancel
          </button>
        </div>
        
        <div id="migrationMessage" style="margin-top: 10px; min-height: 20px;"></div>
      </div>
    `;

    this.attachMigrationEventListeners(container);
    this.updateSelectedCount();
  }

  /**
   * Renders individual migration proposals
   * @returns {string} HTML for proposals
   */
  renderProposals() {
    return this.currentProposals.map((proposal, index) => {
      const fromParts = parseCategoryPath(proposal.originalFolderPath);
      const toParts = parseCategoryPath(proposal.newSuggestedFolderPath);
      
      return `
        <div class="proposal-item" style="border-bottom: 1px solid #eee; padding: 8px 0;">
          <label style="display: flex; align-items: flex-start; cursor: pointer;">
            <input type="checkbox" value="${index}" style="margin-right: 8px; margin-top: 2px;" />
            <div style="flex: 1;">
              <strong>${this.escapeHtml(proposal.bookmarkTitle)}</strong>
              <br />
              <small style="color: #666;">${this.escapeHtml(proposal.bookmarkUrl)}</small>
              <br />
              <div style="margin: 4px 0;">
                <span style="background: #ffebee; padding: 2px 4px; border-radius: 3px;">
                  FROM: ${fromParts.join(' > ')}
                </span>
                <br />
                <span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; margin-top: 2px; display: inline-block;">
                  TO: ${toParts.join(' > ')} (${Math.round(proposal.confidence * 100)}%)
                </span>
              </div>
            </div>
          </label>
        </div>
      `;
    }).join('');
  }

  /**
   * Attaches event listeners for migration UI
   * @param {HTMLElement} container - Container element
   */
  attachMigrationEventListeners(container) {
    // Checkbox change events
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const index = parseInt(checkbox.value);
        if (checkbox.checked) {
          this.selectedProposals.add(index);
        } else {
          this.selectedProposals.delete(index);
        }
        this.updateSelectedCount();
      });
    });

    // Select all button
    const selectAllBtn = container.querySelector('#selectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        checkboxes.forEach(checkbox => {
          checkbox.checked = true;
          this.selectedProposals.add(parseInt(checkbox.value));
        });
        this.updateSelectedCount();
      });
    }

    // Select none button
    const selectNoneBtn = container.querySelector('#selectNoneBtn');
    if (selectNoneBtn) {
      selectNoneBtn.addEventListener('click', () => {
        checkboxes.forEach(checkbox => {
          checkbox.checked = false;
        });
        this.selectedProposals.clear();
        this.updateSelectedCount();
      });
    }

    // Execute migration button
    const executeBtn = container.querySelector('#executeMigrationBtn');
    if (executeBtn) {
      executeBtn.addEventListener('click', () => this.executeSelectedMigrations(container));
    }

    // Cancel button
    const cancelBtn = container.querySelector('#cancelMigrationBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelMigration(container));
    }
  }

  /**
   * Updates the selected count display
   */
  updateSelectedCount() {
    const countElement = document.querySelector('#selectedCount');
    if (countElement) {
      countElement.textContent = this.selectedProposals.size;
    }
  }

  /**
   * Executes the selected migrations
   * @param {HTMLElement} container - Container element
   */
  async executeSelectedMigrations(container) {
    if (this.selectedProposals.size === 0) {
      this.showMigrationMessage(container, 'Please select at least one bookmark to migrate.', true);
      return;
    }

    this.migrationInProgress = true;
    const executeBtn = container.querySelector('#executeMigrationBtn');
    const cancelBtn = container.querySelector('#cancelMigrationBtn');
    
    // Disable buttons during migration
    if (executeBtn) executeBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      this.showMigrationMessage(container, `Migrating ${this.selectedProposals.size} bookmarks...`);

      // Get selected proposals
      const selectedMoves = Array.from(this.selectedProposals).map(index => this.currentProposals[index]);

      // Execute migration
      const results = await executeMigration(selectedMoves);

      // Show results
      let message = `Migration complete! `;
      message += `${results.successful} successful`;
      if (results.failed > 0) {
        message += `, ${results.failed} failed`;
      }

      this.showMigrationMessage(container, message, results.failed > 0);

      if (results.errors.length > 0) {
        logger.error('Migration errors:', results.errors);
      }

      // Clear UI after successful migration
      setTimeout(() => {
        this.resetMigrationUI(container);
      }, 3000);

    } catch (error) {
      logger.error('Error during migration execution:', error);
      this.showMigrationMessage(container, `Migration failed: ${error.message}`, true);
    } finally {
      this.migrationInProgress = false;
      if (executeBtn) executeBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  /**
   * Cancels the migration process
   * @param {HTMLElement} container - Container element
   */
  cancelMigration(container) {
    this.resetMigrationUI(container);
  }

  /**
   * Resets the migration UI to initial state
   * @param {HTMLElement} container - Container element
   */
  resetMigrationUI(container) {
    this.currentProposals = [];
    this.selectedProposals.clear();
    this.migrationInProgress = false;
    container.innerHTML = '';
  }

  /**
   * Shows a general message in the container
   * @param {HTMLElement} container - Container element
   * @param {string} message - Message to show
   * @param {boolean} isError - Whether this is an error message
   */
  showMessage(container, message, isError = false) {
    container.innerHTML = `
      <div style="padding: 10px; text-align: center; color: ${isError ? '#d32f2f' : '#333'};">
        ${this.escapeHtml(message)}
      </div>
    `;
  }

  /**
   * Shows a message in the migration message area
   * @param {HTMLElement} container - Container element
   * @param {string} message - Message to show
   * @param {boolean} isError - Whether this is an error message
   */
  showMigrationMessage(container, message, isError = false) {
    const messageElement = container.querySelector('#migrationMessage');
    if (messageElement) {
      messageElement.innerHTML = `
        <div style="color: ${isError ? '#d32f2f' : '#4CAF50'}; font-weight: bold;">
          ${this.escapeHtml(message)}
        </div>
      `;
    }
  }

  /**
   * Escapes HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
} 