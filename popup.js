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
  container.textContent = '';
  
  // Extract unique categories from all suggestions
  const level1Categories = [...new Set(suggestions.map(s => s.folderPath.split('/')[0]))];
  const level2Categories = [...new Set(suggestions.map(s => s.folderPath.split('/')[1]).filter(Boolean))];
  const level3Categories = [...new Set(suggestions.map(s => s.folderPath.split('/')[2]).filter(Boolean))];
  
  // Create main suggestions
  suggestions.forEach((suggestion, i) => {
    const div = document.createElement('div');
    const label = document.createElement('label');
    const input = document.createElement('input');
    
    input.type = 'radio';
    input.name = 'folder';
    input.value = i;
    input.checked = i === 0;
    
    label.appendChild(input);
    label.appendChild(document.createTextNode(suggestion.folderPath));
    div.appendChild(label);
    container.appendChild(div);
  });
  
  // Create custom option
  const customDiv = document.createElement('div');
  const customLabel = document.createElement('label');
  const customInput = document.createElement('input');
  
  customInput.type = 'radio';
  customInput.name = 'folder';
  customInput.value = 'custom';
  
  customLabel.appendChild(customInput);
  customLabel.appendChild(document.createTextNode('Custom path:'));
  customDiv.appendChild(customLabel);
  
  // Create radio columns container
  const columnsContainer = document.createElement('div');
  columnsContainer.className = 'radio-columns-container';
  
  // Level 1 column
  const level1Column = document.createElement('div');
  level1Column.className = 'radio-column';
  const level1Title = document.createElement('h4');
  level1Title.textContent = 'Level 1';
  level1Column.appendChild(level1Title);
  
  level1Categories.forEach(cat => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'level1';
    input.value = cat;
    label.appendChild(input);
    label.appendChild(document.createTextNode(cat));
    level1Column.appendChild(label);
  });
  
  // Level 2 column
  const level2Column = document.createElement('div');
  level2Column.className = 'radio-column';
  const level2Title = document.createElement('h4');
  level2Title.textContent = 'Level 2';
  level2Column.appendChild(level2Title);
  
  level2Categories.forEach(cat => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'level2';
    input.value = cat;
    label.appendChild(input);
    label.appendChild(document.createTextNode(cat));
    level2Column.appendChild(label);
  });
  
  // Level 3 column
  const level3Column = document.createElement('div');
  level3Column.className = 'radio-column';
  const level3Title = document.createElement('h4');
  level3Title.textContent = 'Level 3';
  level3Column.appendChild(level3Title);
  
  level3Categories.forEach(cat => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'level3';
    input.value = cat;
    label.appendChild(input);
    label.appendChild(document.createTextNode(cat));
    level3Column.appendChild(label);
  });
  
  columnsContainer.appendChild(level1Column);
  columnsContainer.appendChild(level2Column);
  columnsContainer.appendChild(level3Column);
  customDiv.appendChild(columnsContainer);
  container.appendChild(customDiv);
  
  // Add event listeners to automatically select custom radio when level radio buttons are used
  const levelRadios = container.querySelectorAll('input[name="level1"], input[name="level2"], input[name="level3"]');
  
  levelRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        customInput.checked = true;
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
