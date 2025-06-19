// popup.js - Complete implementation
let currentSuggestions = [];
let currentMetadata = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveBtn').addEventListener('click', save);
  // Auto-start classification when popup loads
  classify();
});

async function classify() {
  const messageEl = document.getElementById('message');
  const suggestionsEl = document.getElementById('suggestions');
  
  messageEl.textContent = 'Classifying bookmark...';
  messageEl.style.color = '';
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
    // No button to re-enable since classification happens automatically
  }
}

function displaySuggestions(suggestions) {
  const container = document.getElementById('suggestions');
  
  // Extract unique categories from all suggestions
  const level1Categories = [...new Set(suggestions.map(s => s.folderPath.split('/')[0]))];
  const level2Categories = [...new Set(suggestions.map(s => s.folderPath.split('/')[1]).filter(Boolean))];
  const level3Categories = [...new Set(suggestions.map(s => s.folderPath.split('/')[2]).filter(Boolean))];
  
  const suggestionsHTML = suggestions.map((s, i) => `
    <div>
      <label>
        <input type="radio" name="folder" value="${i}" ${i === 0 ? 'checked' : ''}>
        ${s.folderPath}
      </label>
    </div>
  `).join('');
  
  const customOptionHTML = `
    <div>
      <label>
        <input type="radio" name="folder" value="custom">
        Custom path:
      </label>
      <div class="radio-columns-container">
        <div class="radio-column">
          <h4>Level 1</h4>
          ${level1Categories.map(cat => `
            <label>
              <input type="radio" name="level1" value="${cat}">
              ${cat}
            </label>
          `).join('')}
        </div>
        <div class="radio-column">
          <h4>Level 2</h4>
          ${level2Categories.map(cat => `
            <label>
              <input type="radio" name="level2" value="${cat}">
              ${cat}
            </label>
          `).join('')}
        </div>
        <div class="radio-column">
          <h4>Level 3</h4>
          ${level3Categories.map(cat => `
            <label>
              <input type="radio" name="level3" value="${cat}">
              ${cat}
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = suggestionsHTML + customOptionHTML;
  
  // Add event listeners to automatically select custom radio when level radio buttons are used
  const levelRadios = container.querySelectorAll('input[name="level1"], input[name="level2"], input[name="level3"]');
  const customRadio = container.querySelector('input[value="custom"]');
  
  levelRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        customRadio.checked = true;
      }
    });
  });
}

async function save() {
  const selected = document.querySelector('input[name="folder"]:checked');
  if (!selected) return;
  
  const btn = document.getElementById('saveBtn');
  const messageEl = document.getElementById('message');
  
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  try {
    let folderPath;
    
    if (selected.value === 'custom') {
      // Handle custom radio button selection
      const level1Radio = document.querySelector('input[name="level1"]:checked');
      const level2Radio = document.querySelector('input[name="level2"]:checked');
      const level3Radio = document.querySelector('input[name="level3"]:checked');
      
      if (!level1Radio) {
        messageEl.textContent = 'Please select at least Level 1 category';
        messageEl.style.color = '#d32f2f';
        return;
      }
      
      // Build custom folder path
      folderPath = level1Radio.value;
      if (level2Radio) folderPath += '/' + level2Radio.value;
      if (level3Radio) folderPath += '/' + level3Radio.value;
    } else {
      // Handle regular suggestion selection
      const suggestion = currentSuggestions[parseInt(selected.value)];
      folderPath = suggestion.folderPath;
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveBookmark',
      folderPath: folderPath,
      metadata: currentMetadata
    });
    
    if (response.success) {
      messageEl.textContent = response.fallback 
        ? 'Saved to Uncategorized folder'
        : `Saved to ${folderPath}`;
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
