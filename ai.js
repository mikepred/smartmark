// ai.js - Simplified for LM Studio
import { getFolderStructure } from './bookmarks.js';
import { SecuritySanitizer } from './security.js';

const lmstudioProvider = {
  async call(prompt) {
    const response = await fetch(`http://localhost:1234/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local-model',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      })
    });
    
    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
};

export async function classifyBookmark(metadata) {
  const existingFolders = await getFolderStructure();
  const prompt = buildPrompt(metadata, existingFolders);
  const response = await lmstudioProvider.call(prompt);
  
  return parseResponse(response);
}

function buildPrompt(metadata, existingFolders) {
  const folderContext = existingFolders.length > 0 
    ? `\nEXISTING FOLDER STRUCTURE (prefer reusing these when topically relevant):\n${existingFolders.map(f => `- ${f}`).join('\n')}\n`
    : '';

  return `You MUST classify this bookmark into a deep 3-level folder hierarchy. Always use the format: MainCategory/Subcategory/SpecificTopic

Title: ${SecuritySanitizer.sanitizeForPrompt(metadata.title)}
URL: ${SecuritySanitizer.sanitizeForPrompt(metadata.url)}
Description: ${SecuritySanitizer.sanitizeForPrompt(metadata.description)}
Content: ${SecuritySanitizer.sanitizeForPrompt(metadata.content)}
${folderContext}
CRITICAL: Each folderPath must have exactly 3 levels separated by forward slashes.

PRIORITIZATION RULES:
1. Create semantically appropriate 3-level paths based on the content
2. ONLY reuse existing folders when they are genuinely topically relevant (strong semantic match)
3. Prefer logical categorization over forcing poor matches with existing folders
4. You may reuse parts of existing paths (like main categories) while creating new subcategories
5. When in doubt, create new appropriate paths rather than misusing existing ones

Examples of correct 3-level paths:
- "Technology/Programming/JavaScript"
- "Entertainment/Movies/Action Films"
- "Education/Science/Physics"

Return ONLY a JSON array with this exact format:
[{"folderPath":"MainCategory/Subcategory/SpecificTopic"}]

Provide exactly 5 suggestions with 3-level folder paths, prioritizing semantic accuracy over existing folder reuse.`;
}

function parseResponse(response) {
  try {
    // Extract JSON array from response
    const match = response.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found');
    
    const parsed = JSON.parse(match[0]);
    
    // Strict validation
    if (!Array.isArray(parsed)) {
      throw new Error('Response must be array');
    }
    
    if (!SecuritySanitizer.validateAIResponse(parsed)) {
      throw new Error('Invalid AI response structure');
    }
    
    return parsed
      .filter(item => 
        item && 
        typeof item === 'object' && 
        typeof item.folderPath === 'string' &&
        item.folderPath.length > 0 &&
        item.folderPath.length < 200
      )
      .map(s => ({
        folderPath: SecuritySanitizer.sanitizeFolderPath(s.folderPath)
      }))
      .slice(0, 5);
  } catch (error) {
    console.error('Parse error:', error);
    return [{ folderPath: 'Uncategorized' }];
  }
}

