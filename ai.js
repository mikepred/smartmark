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

class SecurePromptBuilder {
  static buildIsolatedPrompt(metadata, existingFolders) {
    // Create semantic separation between system instructions and user content
    const systemInstructions = this.getSystemInstructions();
    const userContent = this.sanitizeUserContent(metadata);
    const folderContext = this.buildFolderContext(existingFolders);
    const responseFormat = this.getResponseFormat();
    
    // Use template-based approach with clear boundaries
    return `${systemInstructions}

--- USER CONTENT START ---
${userContent}
--- USER CONTENT END ---

${folderContext}

${responseFormat}`;
  }
  
  static getSystemInstructions() {
    return `SYSTEM: You are a bookmark classification assistant. Your task is to classify bookmarks into a 3-level folder hierarchy using the format: MainCategory/Subcategory/SpecificTopic

CRITICAL REQUIREMENTS:
- Each folderPath must have exactly 3 levels separated by forward slashes
- Create semantically appropriate paths based on the content
- Prioritize logical categorization over forcing matches with existing folders
- Return exactly 5 suggestions as JSON array`;
  }
  
  static sanitizeUserContent(metadata) {
    return `BOOKMARK_TITLE: ${SecuritySanitizer.sanitizeForPrompt(metadata.title)}
BOOKMARK_URL: ${SecuritySanitizer.sanitizeForPrompt(metadata.url)}
BOOKMARK_DESCRIPTION: ${SecuritySanitizer.sanitizeForPrompt(metadata.description)}
BOOKMARK_CONTENT: ${SecuritySanitizer.sanitizeForPrompt(metadata.content)}`;
  }
  
  static buildFolderContext(existingFolders) {
    if (existingFolders.length === 0) return '';
    
    const sanitizedFolders = existingFolders
      .slice(0, 20) // Limit to prevent context pollution
      .map(f => SecuritySanitizer.sanitizeFolderPath(f))
      .filter(f => f && f !== 'Uncategorized');
    
    return `EXISTING_FOLDERS: ${sanitizedFolders.join(', ')}`;
  }
  
  static getResponseFormat() {
    return `RESPONSE_FORMAT: Return ONLY a JSON array with this exact structure:
[{"folderPath":"MainCategory/Subcategory/SpecificTopic"}]

EXAMPLES:
- Technology/Programming/JavaScript
- Entertainment/Movies/Action Films
- Education/Science/Physics`;
  }
}

function buildPrompt(metadata, existingFolders) {
  return SecurePromptBuilder.buildIsolatedPrompt(metadata, existingFolders);
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

