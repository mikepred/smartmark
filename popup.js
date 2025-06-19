// popup.js - Complete implementation
let currentSuggestions = [];
let currentMetadata = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('classifyBtn').addEventListener('click', classify);
  document.getElementById('saveBtn').addEventListener('click', save);
});

async function classify() {
  const btn = document.getElementById('classifyBtn');
  const messageEl = document.getElementById('message');
  const suggestionsEl = document.getElementById('suggestions');
  
  btn.disabled = true;
  btn.textContent = 'Classifying...';
  messageEl.textContent = '';
  suggestionsEl.innerHTML = '';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'classify' });
    
    if (response.success) {
      currentSuggestions = response.suggestions;
      currentMetadata = response.metadata;
      
      displaySuggestions(response.suggestions);
      document.getElementById('saveBtn').style.display = 'block';
    } else {
      messageEl.textContent = `Error: ${response.error}`;
      messageEl.style.color = '#d32f2f';
    }
  } catch (error) {
    messageEl.textContent = 'Failed to classify bookmark';
    messageEl.style.color = '#d32f2f';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Classify Bookmark';
  }
}

function displaySuggestions(suggestions) {
  const container = document.getElementById('suggestions');
  
  container.innerHTML = suggestions.map((s, i) => `
    <div>
      <label>
        <input type="radio" name="folder" value="${i}" ${i === 0 ? 'checked' : ''}>
        ${s.folderPath} (${Math.round(s.confidence * 100)}%)
      </label>
    </div>
  `).join('');
}

async function save() {
  const selected = document.querySelector('input[name="folder"]:checked');
  if (!selected) return;
  
  const btn = document.getElementById('saveBtn');
  const messageEl = document.getElementById('message');
  
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  try {
    const suggestion = currentSuggestions[parseInt(selected.value)];
    const response = await chrome.runtime.sendMessage({
      action: 'saveBookmark',
      folderPath: suggestion.folderPath,
      metadata: currentMetadata
    });
    
    if (response.success) {
      messageEl.textContent = response.fallback 
        ? 'Saved to Uncategorized folder'
        : `Saved to ${suggestion.folderPath}`;
      messageEl.style.color = '#2e7d32';
      
      // Reset UI
      setTimeout(() => {
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('saveBtn').style.display = 'none';
        messageEl.textContent = '';
      }, 2000);
    } else {
      messageEl.textContent = `Error: ${response.error}`;
      messageEl.style.color = '#d32f2f';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Bookmark';
  }
}
