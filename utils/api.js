// File: utils/api.js

import { getBookmarkFolderStructure } from './bookmark.js';
import { getFromStorage } from './storage.js';

// API configuration constants
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
const MAX_OUTPUT_TOKENS = 50;
const TEMPERATURE = 0.7;

// LM Studio default configuration
const LMSTUDIO_DEFAULTS = {
  host: 'localhost',
  port: '1234',
  model: 'gemma-3-1b' // Default model, can be configured later
};

// Ollama default configuration
const OLLAMA_DEFAULTS = {
  host: 'localhost',
  port: '11434',
  model: 'gemma3:4b' // Default model, can be configured later
};

// Token management configuration
const TOKEN_LIMITS = {
  maxPromptTokens: 900000,  // Conservative limit for Gemini (1M available)
  maxResponseTokens: 200,   // Current setting
  contextBufferTokens: 50000, // Safety buffer
  maxContextTokens: 50000   // Default max tokens for bookmark context
};

/**
 * Estimates the token count for a given text string
 * @param {string} text - The text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokenCount(text) {
  // Rough estimation: ~3.5 characters per token (conservative for safety)
  return Math.ceil(text.length / 3.5);
}

/**
 * Gets the current token limits configuration
 * @returns {object} Token limits configuration
 */
function getTokenLimits() {
  return { ...TOKEN_LIMITS };
}

/**
 * Prioritizes folders for inclusion in context, favoring root folders and shallow hierarchies
 * @param {string[]} folders - Array of folder paths
 * @param {number} maxFolders - Maximum number of folders to include
 * @returns {string[]} Prioritized array of folder paths
 */
function prioritizeFolders(folders, maxFolders = 50) {
  if (!folders || folders.length === 0) return [];
  if (folders.length <= maxFolders) return [...folders];

  // 1. Separate by depth
  const rootFolders = folders.filter(f => !f.includes('/'));
  const subFolders = folders.filter(f => f.includes('/'));
  
  // 2. Prioritize root folders (always include)
  const prioritized = [...rootFolders];
  
  // 3. Add most relevant subfolders
  const remainingSlots = maxFolders - rootFolders.length;
  if (remainingSlots > 0) {
    // Sort by depth (prefer shallow), then alphabetically for consistency
    const sortedSubs = subFolders
      .sort((a, b) => {
        const depthDiff = a.split('/').length - b.split('/').length;
        if (depthDiff !== 0) return depthDiff;
        return a.localeCompare(b);
      })
      .slice(0, remainingSlots);
    prioritized.push(...sortedSubs);
  }
  
  return prioritized;
}

/**
 * Builds the context section for the AI prompt
 * @param {string[]} folders - Array of folder paths to include
 * @returns {string} Formatted context section
 */
function buildContextSection(folders) {
  if (!folders || folders.length === 0) return '';
  
  return `

EXISTING BOOKMARK FOLDER STRUCTURE:
The user has organized their bookmarks into the following folders. Please prioritize suggesting folder paths that align with or logically extend this existing organization:

${folders.map(path => `- ${path}`).join('\n')}

When suggesting new folder paths, consider:
1. Using existing folders if the bookmark fits well
2. Creating logical sub-folders within existing categories
3. Following the user's established naming conventions and organizational patterns
4. Maintaining consistency with the existing folder hierarchy

`;
}

/**
 * Generates the base prompt for bookmark classification
 * @param {object} metadata - The bookmark metadata
 * @param {string} contextSection - The context section to include
 * @returns {string} Complete prompt text
 */
function buildPrompt(metadata, contextSection = '') {
  return `Classify the following bookmark and return the top 3 most likely folder paths for this bookmark, in order of confidence, as a JSON array. Each item should have 'folderPath' and 'confidence' fields. Example: [{"folderPath":"Tech/Python","confidence":0.92},{"folderPath":"Programming/AI","confidence":0.75},{"folderPath":"Learning","confidence":0.60}]. Return ONLY the JSON array.${contextSection}

BOOKMARK TO CLASSIFY:
Title: ${metadata.title}
Domain: ${metadata.domain}
URL: ${metadata.url}
Description: ${metadata.description}
Heading: ${metadata.heading}
Author: ${metadata.author || 'N/A'}
Published Date: ${metadata.publishedDate || 'N/A'}
URL Path: ${metadata.urlPath.join('/')}
Keywords: ${metadata.keywords || 'N/A'}
Main Content Snippet: ${(metadata.mainContent || '').substring(0, 1000)}...`;
}

/**
 * Retrieves the API key from local storage
 * @returns {Promise<string>} The API key
 * @throws {Error} If API key is not set
 */
export async function getApiKey() {
  const result = await chrome.storage.local.get(['apiKey']);
  if (!result.apiKey) {
    throw new Error("API key not set. Please configure it in the extension settings.");
  }
  return result.apiKey;
}

/**
 * Gets LM Studio configuration from storage
 * @returns {Promise<object>} LM Studio configuration
 */
async function getLMStudioConfig() {
  const host = await getFromStorage('lmstudioHost') || LMSTUDIO_DEFAULTS.host;
  const port = await getFromStorage('lmstudioPort') || LMSTUDIO_DEFAULTS.port;
  return { host, port };
}

/**
 * Gets Ollama configuration from storage
 * @returns {Promise<object>} Ollama configuration
 */
async function getOllamaConfig() {
  const host = await getFromStorage('ollamaHost') || OLLAMA_DEFAULTS.host;
  const port = await getFromStorage('ollamaPort') || OLLAMA_DEFAULTS.port;
  return { host, port };
}

/**
 * Gets the currently selected AI provider
 * @returns {Promise<string>} The selected provider ('gemini', 'lmstudio', 'ollama')
 */
async function getAIProvider() {
  return await getFromStorage('aiProvider') || 'gemini';
}

/**
 * Sends a request to the selected LLM API to classify a bookmark into folder paths.
 * Enhanced with intelligent token management and adaptive context optimization.
 * Supports multiple providers: Gemini, LM Studio, and Ollama.
 * @param {object} metadata - The metadata of the page to classify
 * @param {string} [apiKey] - The API key for authentication (required for Gemini)
 * @param {boolean} [forceRefresh=false] - Force refresh of bookmark folder cache
 * @param {number} [maxContextTokens=50000] - Maximum tokens to allocate for bookmark context
 * @returns {Promise} The suggested folder paths from the API response
 * @throws {Error} If the API request fails or response is invalid
 */
export async function getFolderPathFromLLM(metadata, apiKey = null, forceRefresh = false, maxContextTokens = TOKEN_LIMITS.maxContextTokens) {
  const startTime = performance.now();
  
  // Get existing bookmark folder structure for context
  const existingFolders = await getBookmarkFolderStructure(forceRefresh);
  
  if (!existingFolders || existingFolders.length === 0) {
    // No context needed - proceed with basic prompt
    console.log('📊 Token Management: No bookmark folders found, using basic prompt');
    const basicPrompt = buildPrompt(metadata);
    const tokenCount = estimateTokenCount(basicPrompt);
    console.log(`📊 Basic prompt tokens: ${tokenCount}`);
    
    // Get the selected AI provider and call appropriate API
    const provider = await getAIProvider();
    console.log(`🤖 Using AI provider: ${provider}`);
    
    switch (provider) {
      case 'lmstudio':
        const lmstudioConfig = await getLMStudioConfig();
        return await callLMStudioAPI(basicPrompt, lmstudioConfig);
      
      case 'ollama':
        // TODO: Implement Ollama support in future task
        throw new Error('Ollama provider not yet implemented');
      
      case 'gemini':
      default:
        if (!apiKey) {
          throw new Error('API key is required for Gemini provider');
        }
        return await callGeminiAPI(basicPrompt, apiKey);
    }
  }

  // Build and optimize context with token management
  let contextSection = '';
  let optimizedFolders = existingFolders;
  let optimizationApplied = false;

  // Step 1: Try full context first
  const fullContextSection = buildContextSection(existingFolders);
  const fullPrompt = buildPrompt(metadata, fullContextSection);
  const fullPromptTokens = estimateTokenCount(fullPrompt);

  if (fullPromptTokens <= maxContextTokens) {
    // Full context fits within limits
    contextSection = fullContextSection;
    console.log(`📊 Token Management: Full context included (${existingFolders.length} folders, ${fullPromptTokens} tokens)`);
  } else {
    // Need to optimize - apply progressive truncation
    console.warn(`📊 Token Management: Large bookmark structure detected (${existingFolders.length} folders, ${fullPromptTokens} tokens). Applying optimization...`);
    optimizationApplied = true;

    // Try progressively smaller context sizes
    const maxFolderLimits = [100, 75, 50, 25, 15, 10];
    let optimizationSuccessful = false;

    for (const limit of maxFolderLimits) {
      optimizedFolders = prioritizeFolders(existingFolders, limit);
      contextSection = buildContextSection(optimizedFolders);
      const testPrompt = buildPrompt(metadata, contextSection);
      const testTokens = estimateTokenCount(testPrompt);

      if (testTokens <= maxContextTokens) {
        console.log(`📊 Token Management: Optimized to ${optimizedFolders.length}/${existingFolders.length} folders (${testTokens} tokens)`);
        optimizationSuccessful = true;
        break;
      }
    }

    // Final fallback: remove context entirely if still too large
    if (!optimizationSuccessful) {
      console.warn('📊 Token Management: Context too large even after optimization - proceeding without bookmark context');
      contextSection = '';
      optimizedFolders = [];
    }
  }

  // Build final prompt and call appropriate API
  const finalPrompt = buildPrompt(metadata, contextSection);
  const finalTokens = estimateTokenCount(finalPrompt);
  
  // Enhanced logging
  console.log(`📊 Token Management Summary:`);
  console.log(`   Original folders: ${existingFolders.length}`);
  console.log(`   Included folders: ${optimizedFolders.length}`);
  console.log(`   Final prompt tokens: ${finalTokens}`);
  console.log(`   Optimization applied: ${optimizationApplied}`);
  
  if (optimizationApplied && optimizedFolders.length > 0) {
    console.log(`   Priority folders included: ${optimizedFolders.slice(0, 5).join(', ')}${optimizedFolders.length > 5 ? '...' : ''}`);
  }

  const endTime = performance.now();
  console.log(`📊 Token management processing time: ${(endTime - startTime).toFixed(2)}ms`);

  // Get the selected AI provider and call appropriate API
  const provider = await getAIProvider();
  console.log(`🤖 Using AI provider: ${provider}`);
  
  switch (provider) {
    case 'lmstudio':
      const lmstudioConfig = await getLMStudioConfig();
      return await callLMStudioAPI(finalPrompt, lmstudioConfig);
    
    case 'ollama':
      const ollamaConfig = await getOllamaConfig();
      return await callOllamaAPI(finalPrompt, ollamaConfig);
    
    case 'gemini':
    default:
      if (!apiKey) {
        throw new Error('API key is required for Gemini provider');
      }
      return await callGeminiAPI(finalPrompt, apiKey);
  }
}

/**
 * Makes an API call to LM Studio
 * @param {string} prompt - The complete prompt to send
 * @param {object} config - LM Studio configuration (host, port)
 * @returns {Promise} The parsed suggestions from the API
 */
async function callLMStudioAPI(prompt, config) {
  const { host, port } = config;
  const apiUrl = `http://${host}:${port}/v1/chat/completions`;
  
  const requestBody = {
    model: LMSTUDIO_DEFAULTS.model, // LM Studio will use whatever model is loaded
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: TEMPERATURE,
    max_tokens: 200,
    stream: false
  };

  console.log(`🔌 Calling LM Studio API at ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = `LM Studio API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
          errorMessage = `LM Studio API Error: ${errorData.error.message}`;
        }
      } catch (e) {
        // If error response isn't JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("LM Studio API Error: Invalid response format or no content returned.");
    }
    
    const rawResponse = data.choices[0].message.content.trim();
    console.log('LM Studio rawResponse:', rawResponse);
    
    // Try to parse the JSON array from the response
    try {
      let jsonText = rawResponse;
      // If not valid JSON, try to extract the first JSON array
      if (!jsonText.trim().startsWith('[')) {
        const firstBracket = jsonText.indexOf('[');
        const lastBracket = jsonText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonText = jsonText.substring(firstBracket, lastBracket + 1);
        }
      }
      const suggestions = JSON.parse(jsonText);
      if (!Array.isArray(suggestions)) throw new Error('AI did not return an array');
      return suggestions;
    } catch (e) {
      throw new Error('Failed to parse AI folder suggestions: ' + e.message + '\nRaw response: ' + rawResponse);
    }
    
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to LM Studio at ${apiUrl}. Please ensure LM Studio is running and accessible.`);
    }
    throw error;
  }
}

/**
 * Makes an API call to Ollama
 * @param {string} prompt - The complete prompt to send
 * @param {object} config - Ollama configuration (host, port)
 * @returns {Promise} The parsed suggestions from the API
 */
async function callOllamaAPI(prompt, config) {
  const { host, port } = config;
  const apiUrl = `http://${host}:${port}/api/generate`;
  
  const requestBody = {
    model: OLLAMA_DEFAULTS.model, // Ollama will use the specified model
    prompt: prompt,
    format: 'json', // Request JSON format for easier parsing
    stream: false,
    options: {
      temperature: TEMPERATURE,
      num_predict: 200 // Equivalent to max_tokens
    }
  };

  console.log(`🔌 Calling Ollama API at ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = `Ollama API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `Ollama API Error: ${errorData.error}`;
        }
      } catch (e) {
        // If error response isn't JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error("Ollama API Error: Invalid response format or no content returned.");
    }
    
    const rawResponse = data.response.trim();
    console.log('Ollama rawResponse:', rawResponse);
    
    // Try to parse the JSON array from the response
    try {
      let jsonText = rawResponse;
      // If not valid JSON, try to extract the first JSON array
      if (!jsonText.trim().startsWith('[')) {
        const firstBracket = jsonText.indexOf('[');
        const lastBracket = jsonText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonText = jsonText.substring(firstBracket, lastBracket + 1);
        }
      }
      const suggestions = JSON.parse(jsonText);
      if (!Array.isArray(suggestions)) throw new Error('AI did not return an array');
      return suggestions;
    } catch (e) {
      throw new Error('Failed to parse AI folder suggestions: ' + e.message + '\nRaw response: ' + rawResponse);
    }
    
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to Ollama at ${apiUrl}. Please ensure Ollama is running and accessible.`);
    }
    throw error;
  }
}

/**
 * Makes the actual API call to Gemini
 * @param {string} prompt - The complete prompt to send
 * @param {string} apiKey - The API key for authentication
 * @returns {Promise} The parsed suggestions from the API
 */
async function callGeminiAPI(prompt, apiKey) {
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: TEMPERATURE,
        maxOutputTokens: 200
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.error?.message || 'Unknown error';
    throw new Error(`Gemini API Error: ${errorMessage}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
    throw new Error("Gemini API Error: The request was blocked due to safety concerns.");
  }
  if (!data.candidates || !data.candidates[0].content) {
    throw new Error("Gemini API Error: Invalid response format or no content returned.");
  }
  
  const rawResponse = data.candidates[0].content.parts[0].text.trim();
  console.log('Gemini rawResponse:', rawResponse);
  
  // Try to parse the JSON array from the response
  try {
    let jsonText = rawResponse;
    // If not valid JSON, try to extract the first JSON array
    if (!jsonText.trim().startsWith('[')) {
      const firstBracket = jsonText.indexOf('[');
      const lastBracket = jsonText.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonText = jsonText.substring(firstBracket, lastBracket + 1);
      }
    }
    const suggestions = JSON.parse(jsonText);
    if (!Array.isArray(suggestions)) throw new Error('AI did not return an array');
    return suggestions;
  } catch (e) {
    throw new Error('Failed to parse AI folder suggestions: ' + e.message + '\nRaw response: ' + rawResponse);
  }
}
