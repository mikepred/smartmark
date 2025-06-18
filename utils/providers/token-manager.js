// Token management utilities
import { config } from '../config/index.js';
import { logger } from '../error/index.js';

/**
 * Manages token counting and context optimization for AI prompts
 */
export class TokenManager {
  /**
   * Estimates the token count for a given text string
   * @param {string} text - The text to estimate tokens for
   * @returns {number} Estimated token count
   */
  static estimateTokenCount(text) {
    // Rough estimation: ~3.5 characters per token (conservative for safety)
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Gets the current token limits configuration
   * @returns {object} Token limits configuration
   */
  static getTokenLimits() {
    return { ...config.get('api.tokenLimits') };
  }

  /**
   * Prioritizes folders for inclusion in context, favoring root folders and shallow hierarchies
   * @param {string[]} folders - Array of folder paths
   * @param {number} maxFolders - Maximum number of folders to include
   * @returns {string[]} Prioritized array of folder paths
   */
  static prioritizeFolders(folders, maxFolders = 50) {
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
   * Optimizes context to fit within token limits
   * @param {string[]} folders - Array of folder paths
   * @param {string} basePrompt - The base prompt without context
   * @param {number} maxContextTokens - Maximum tokens allowed for context
   * @returns {object} Optimization result with folders and stats
   */
  static optimizeContext(folders, basePrompt, maxContextTokens) {
    const startTime = performance.now();
    const result = {
      folders: [],
      originalCount: folders.length,
      includedCount: 0,
      optimizationApplied: false,
      tokenCount: 0,
      processingTime: 0
    };

    if (!folders || folders.length === 0) {
      logger.info('📊 Token Management: No folders to optimize');
      return result;
    }

    // Try full context first
    const fullContext = this.buildContextSection(folders);
    const fullPrompt = basePrompt + fullContext;
    const fullTokens = this.estimateTokenCount(fullPrompt);

    if (fullTokens <= maxContextTokens) {
      // Full context fits
      result.folders = folders;
      result.includedCount = folders.length;
      result.tokenCount = fullTokens;
      logger.info(`📊 Token Management: Full context included (${folders.length} folders, ${fullTokens} tokens)`);
    } else {
      // Need to optimize
      logger.warn(`📊 Token Management: Large context detected (${folders.length} folders, ${fullTokens} tokens). Optimizing...`);
      result.optimizationApplied = true;

      // Try progressively smaller context sizes
      const maxFolderLimits = [100, 75, 50, 25, 15, 10];
      let optimizationSuccessful = false;

      for (const limit of maxFolderLimits) {
        const optimizedFolders = this.prioritizeFolders(folders, limit);
        const contextSection = this.buildContextSection(optimizedFolders);
        const testPrompt = basePrompt + contextSection;
        const testTokens = this.estimateTokenCount(testPrompt);

        if (testTokens <= maxContextTokens) {
          result.folders = optimizedFolders;
          result.includedCount = optimizedFolders.length;
          result.tokenCount = testTokens;
          optimizationSuccessful = true;
          logger.info(`📊 Token Management: Optimized to ${optimizedFolders.length}/${folders.length} folders (${testTokens} tokens)`);
          break;
        }
      }

      // Final fallback: no context
      if (!optimizationSuccessful) {
        logger.warn('📊 Token Management: Context too large even after optimization - proceeding without context');
        result.folders = [];
        result.includedCount = 0;
        result.tokenCount = this.estimateTokenCount(basePrompt);
      }
    }

    result.processingTime = performance.now() - startTime;
    
    logger.info('📊 Token Management Summary:', {
      originalFolders: result.originalCount,
      includedFolders: result.includedCount,
      finalPromptTokens: result.tokenCount,
      optimizationApplied: result.optimizationApplied,
      processingTimeMs: result.processingTime.toFixed(2)
    });

    if (result.optimizationApplied && result.includedCount > 0) {
      logger.debug(`Priority folders included: ${result.folders.slice(0, 5).join(', ')}${result.folders.length > 5 ? '...' : ''}`);
    }

    return result;
  }

  /**
   * Builds the context section for the AI prompt
   * @param {string[]} folders - Array of folder paths to include
   * @returns {string} Formatted context section
   */
  static buildContextSection(folders) {
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
} 