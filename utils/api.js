/**
 * @fileoverview API Communication Module
 * @module utils/api
 * @description Handles all AI API communications for bookmark classification.
 * This module provides a unified interface for interacting with multiple AI providers
 * (Gemini, LM Studio, Ollama) through the provider abstraction layer.
 */

import { getBookmarkFolderStructure } from './bookmark.js';
import { getFromStorage } from './storage.js';
import { config, getStorageKey } from './config/index.js';
import { ConfigurationError, logger } from './error/index.js';
import { AIProviderFactory, TokenManager } from './providers/index.js';

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
  return { ...config.get('api.tokenLimits') };
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
 * @private
 * @param {object} metadata - The bookmark metadata
 * @param {string} metadata.title - Page title
 * @param {string} metadata.domain - Domain name
 * @param {string} metadata.url - Full URL
 * @param {string} metadata.description - Page description
 * @param {string} metadata.heading - Main heading
 * @param {string} [metadata.author] - Page author
 * @param {string} [metadata.publishedDate] - Publication date
 * @param {string[]} metadata.urlPath - URL path segments
 * @param {string} [metadata.keywords] - Page keywords
 * @param {string} [metadata.mainContent] - Main content snippet
 * @param {string} [contextSection=''] - The context section to include
 * @returns {string} Complete prompt text formatted for AI classification
 */
function buildPrompt(metadata, contextSection = '') {
  return `Classify the following bookmark and return the top 5 most likely folder paths for this bookmark, in order of confidence, as a JSON array. Aim for 2 to 3 levels of depth (e.g., 'Category/SubCategory' or 'Category/SubCategory/SpecificTopic') where appropriate. Each item should have 'folderPath' and 'confidence' fields. Example: [{"folderPath":"Tech/AI/LLMs","confidence":0.92},{"folderPath":"Programming/JavaScript/Frameworks","confidence":0.85},{"folderPath":"Business/Startups/Funding","confidence":0.70}].

IMPORTANT: Avoid suggesting overly broad, single-level categories (e.g., 'AI', 'Programming', 'Tech') if a more specific multi-level folder path (e.g., 'AI/Machine Learning', 'Programming/JavaScript/React', 'Tech/Gadgets/Smartphones') would be more appropriate for the content. A single-level category should only be used if the bookmark is a very general, top-level resource about that broad topic itself. Return ONLY the JSON array.${contextSection}

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
 * @async
 * @returns {Promise<string>} The API key
 * @throws {ConfigurationError} If API key is not set
 * @example
 * try {
 *   const apiKey = await getApiKey();
 *   // Use apiKey for API calls
 * } catch (error) {
 *   console.error('API key not configured:', error);
 * }
 */
export async function getApiKey() {
  const apiKeyStorageKey = getStorageKey('apiKey');
  const result = await chrome.storage.local.get([apiKeyStorageKey]);
  if (!result[apiKeyStorageKey]) {
    throw new ConfigurationError("API key not set. Please configure it in the extension settings.", 'apiKey');
  }
  return result[apiKeyStorageKey];
}

/**
 * Sends a request to the selected LLM API to classify a bookmark into folder paths.
 * Enhanced with intelligent token management and adaptive context optimization.
 * Supports multiple providers: Gemini, LM Studio, and Ollama.
 * 
 * @async
 * @param {object} metadata - The metadata of the page to classify
 * @param {string} metadata.title - Page title
 * @param {string} metadata.domain - Domain name
 * @param {string} metadata.url - Full URL
 * @param {string} metadata.description - Page description
 * @param {string} metadata.heading - Main heading
 * @param {string} [metadata.author] - Page author
 * @param {string} [metadata.publishedDate] - Publication date
 * @param {string[]} metadata.urlPath - URL path segments
 * @param {string} [metadata.keywords] - Page keywords
 * @param {string} [metadata.mainContent] - Main content snippet
 * @param {string} [apiKey=null] - The API key for authentication (required for Gemini)
 * @param {boolean} [forceRefresh=false] - Force refresh of bookmark folder cache
 * @param {number} [maxContextTokens=50000] - Maximum tokens to allocate for bookmark context
 * 
 * @returns {Promise<Array<{folderPath: string, confidence: number}>>} The suggested folder paths from the API
 * 
 * @throws {ConfigurationError} If provider configuration is invalid
 * @throws {APIError} If the API request fails
 * @throws {NetworkError} If network connection fails
 * 
 * @example
 * const metadata = {
 *   title: 'Machine Learning Tutorial',
 *   domain: 'example.com',
 *   url: 'https://example.com/ml-tutorial',
 *   description: 'Learn ML basics',
 *   heading: 'Introduction to Machine Learning',
 *   urlPath: ['ml-tutorial'],
 *   mainContent: 'This tutorial covers...'
 * };
 * 
 * try {
 *   const suggestions = await getFolderPathFromLLM(metadata, apiKey);
 *   console.log('Suggested folders:', suggestions);
 * } catch (error) {
 *   console.error('Classification failed:', error);
 * }
 */
export async function getFolderPathFromLLM(metadata, apiKey = null, forceRefresh = false, maxContextTokens = config.get('api.tokenLimits.maxContextTokens')) {
  const startTime = performance.now();
  
  // Get existing bookmark folder structure for context
  const existingFolders = await getBookmarkFolderStructure(forceRefresh);
  
  // Build base prompt
  const basePrompt = buildPrompt(metadata);
  
  // Optimize context if folders exist
  let contextSection = '';
  if (existingFolders && existingFolders.length > 0) {
    const optimizationResult = TokenManager.optimizeContext(
      existingFolders,
      basePrompt,
      maxContextTokens
    );
    contextSection = TokenManager.buildContextSection(optimizationResult.folders);
  } else {
    logger.info('📊 Token Management: No bookmark folders found, using basic prompt');
  }

  // Build final prompt
  const finalPrompt = buildPrompt(metadata, contextSection);
  
  // Get the AI provider and make the request
  const provider = await AIProviderFactory.createCurrentProvider({ apiKey });
  logger.info(`🤖 Using AI provider: ${provider.name}`);
  
  try {
    const suggestions = await provider.getFolderSuggestions(finalPrompt);
    
    const endTime = performance.now();
    logger.debug(`✅ Request completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return suggestions;
  } catch (error) {
    logger.error(`❌ Error getting folder suggestions:`, error);
    throw error;
  }
}
