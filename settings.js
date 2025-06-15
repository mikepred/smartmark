// File: settings.js

import { displayMessage, clearMessage } from '/utils/ui.js';
import { saveToStorage, getFromStorage, validateApiKey } from '/utils/storage.js';

const aiProviderSelect = document.getElementById('aiProvider');
const apiKeyInput = document.getElementById('apiKey');
const lmstudioHostInput = document.getElementById('lmstudioHost');
const lmstudioPortInput = document.getElementById('lmstudioPort');
const ollamaHostInput = document.getElementById('ollamaHost');
const ollamaPortInput = document.getElementById('ollamaPort');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');
const geminiConfig = document.getElementById('geminiConfig');
const lmstudioConfig = document.getElementById('lmstudioConfig');
const ollamaConfig = document.getElementById('ollamaConfig');

// Show or hide configuration sections based on selected provider
function updateConfigVisibility() {
  const provider = aiProviderSelect.value;
  geminiConfig.classList.toggle('hidden', provider !== 'gemini');
  lmstudioConfig.classList.toggle('hidden', provider !== 'lmstudio');
  ollamaConfig.classList.toggle('hidden', provider !== 'ollama');
}

// Load saved settings when the settings page is opened
document.addEventListener('DOMContentLoaded', async () => {
  const savedProvider = await getFromStorage('aiProvider') || 'gemini';
  aiProviderSelect.value = savedProvider;
  updateConfigVisibility();
  
  if (savedProvider === 'gemini') {
    const savedApiKey = await getFromStorage('apiKey');
    if (savedApiKey) {
      apiKeyInput.value = savedApiKey;
    }
  } else if (savedProvider === 'lmstudio') {
    const savedHost = await getFromStorage('lmstudioHost');
    const savedPort = await getFromStorage('lmstudioPort');
    if (savedHost) lmstudioHostInput.value = savedHost;
    if (savedPort) lmstudioPortInput.value = savedPort;
  } else if (savedProvider === 'ollama') {
    const savedHost = await getFromStorage('ollamaHost');
    const savedPort = await getFromStorage('ollamaPort');
    if (savedHost) ollamaHostInput.value = savedHost;
    if (savedPort) ollamaPortInput.value = savedPort;
  }
});

// Update visibility when provider selection changes
aiProviderSelect.addEventListener('change', updateConfigVisibility);

// Save settings when the save button is clicked
saveButton.addEventListener('click', async (event) => {
  event.preventDefault();
  const provider = aiProviderSelect.value;
  await saveToStorage('aiProvider', provider);
  
  if (provider === 'gemini') {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      displayMessage(statusDiv, 'Please enter an API key for Gemini.', true);
      return;
    }
    if (!validateApiKey(apiKey)) {
      displayMessage(statusDiv, 'Invalid API key format. Please check your Gemini API key.', true);
      return;
    }
    await saveToStorage('apiKey', apiKey);
  } else if (provider === 'lmstudio') {
    const host = lmstudioHostInput.value.trim() || 'localhost';
    const port = lmstudioPortInput.value.trim() || '1234';
    await saveToStorage('lmstudioHost', host);
    await saveToStorage('lmstudioPort', port);
  } else if (provider === 'ollama') {
    const host = ollamaHostInput.value.trim() || 'localhost';
    const port = ollamaPortInput.value.trim() || '11434';
    await saveToStorage('ollamaHost', host);
    await saveToStorage('ollamaPort', port);
  }
  
  displayMessage(statusDiv, 'Settings saved.');
  clearMessage(statusDiv, 2000);
});
