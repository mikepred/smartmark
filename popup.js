// File: popup.js
// This file now only handles DOM initialization and delegates all logic to UIController

import { UIController } from '/utils/business/index.js';

// DOM elements
const elements = {
  classifyBtn: document.getElementById('classifyBtn'),
  messageDiv: document.getElementById('message'),
  suggestionsContainer: document.getElementById('suggestionsContainer'),
  saveBookmarkBtn: document.getElementById('saveBookmarkBtn'),
  migrationBtn: document.getElementById('migrationBtn'),
  migrationContainer: document.getElementById('migrationContainer')
};

// Initialize UI Controller
const uiController = new UIController();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  uiController.init(elements);
});
