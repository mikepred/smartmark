// File: popup.js

import { displayMessage, clearMessage, toggleButtonState } from '/utils/ui.js';
import { checkRuntimeError, handleError } from '/utils/error.js';

const classifyBtn = document.getElementById('classifyBtn');
const messageDiv = document.getElementById('message');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const saveBookmarkBtn = document.getElementById('saveBookmarkBtn');
let currentSuggestions = [];
let currentMetadata = null;
let selectedFolderPath = null;

classifyBtn.addEventListener('click', () => {
  try {
    toggleButtonState(classifyBtn, true, 'Classifying...');
    displayMessage(messageDiv, 'Analyzing page content...');
    suggestionsContainer.innerHTML = '';
    saveBookmarkBtn.style.display = 'none';
    selectedFolderPath = null;
    currentSuggestions = [];
    currentMetadata = null;

    chrome.runtime.sendMessage({ action: 'classify' }, (response) => {
      const runtimeError = checkRuntimeError();
      if (runtimeError) {
        displayMessage(messageDiv, runtimeError, true);
        return;
      }
      if (response.success && response.suggestions && response.suggestions.length > 0) {
        currentSuggestions = response.suggestions;
        currentMetadata = response.metadata;
        renderSuggestions(currentSuggestions);
        displayMessage(messageDiv, 'Select a folder and click Save.');
        saveBookmarkBtn.style.display = 'block';
      } else if (response.success && (!response.suggestions || response.suggestions.length === 0)) {
        displayMessage(messageDiv, 'No folder suggestions available.', true);
      } else {
        displayMessage(messageDiv, 'Error: ' + response.error, true);
      }
    });
  } catch (error) {
    const errorMessage = handleError('Classification', error);
    displayMessage(messageDiv, errorMessage, true);
  } finally {
    toggleButtonState(classifyBtn, false, 'Classify Bookmark');
    clearMessage(messageDiv, 1000);
  }
});

function renderSuggestions(suggestions) {
  suggestionsContainer.innerHTML = '';
  suggestions.forEach((s, idx) => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'folderSuggestion';
    radio.value = s.folderPath;
    radio.id = `suggestion_${idx}`;
    radio.style.marginRight = '0.5em';
    radio.addEventListener('change', () => {
      selectedFolderPath = s.folderPath;
    });
    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.textContent = `${s.folderPath} (${Math.round(s.confidence * 100)}%)`;
    const div = document.createElement('div');
    div.style.textAlign = 'left';
    div.appendChild(radio);
    div.appendChild(label);
    suggestionsContainer.appendChild(div);
  });
  // Select the first by default
  if (suggestions.length > 0) {
    document.getElementById('suggestion_0').checked = true;
    selectedFolderPath = suggestions[0].folderPath;
  }
}

saveBookmarkBtn.addEventListener('click', () => {
  if (!selectedFolderPath || !currentMetadata) {
    displayMessage(messageDiv, 'Please select a folder.', true);
    return;
  }
  toggleButtonState(saveBookmarkBtn, true, 'Saving...');
  chrome.runtime.sendMessage({
    action: 'saveBookmarkWithFolder',
    folderPath: selectedFolderPath,
    metadata: currentMetadata
  }, (response) => {
    if (response.success) {
      displayMessage(messageDiv, `Bookmark saved to: ${selectedFolderPath}`);
      suggestionsContainer.innerHTML = '';
      saveBookmarkBtn.style.display = 'none';
    } else {
      displayMessage(messageDiv, 'Error: ' + response.error, true);
    }
    toggleButtonState(saveBookmarkBtn, false, 'Save Bookmark');
    clearMessage(messageDiv, 1000);
  });
});
