// File: utils/migration.js
// Handles logic for migrating existing bookmarks to a more hierarchical structure.

import { getFolderPathFromLLM } from './api.js';
import { parseCategoryPath, findOrCreateFolder } from './bookmark.js';
import { logger } from './error/index.js';

// List of common generic top-level folder names that might benefit from re-classification.
// This list can be expanded or refined based on common user patterns.
const GENERIC_TOP_LEVEL_FOLDERS = [
  'AI', 'Tech', 'Programming', 'Software', 'Development', 'Code',
  'News', 'Articles', 'Reading', 'To Read', 'Bookmarks',
  'Personal', 'Work', 'Office', 'Business', 'Projects', 'Tasks',
  'Shopping', 'Travel', 'Recipes', 'Food', 'Health', 'Fitness',
  'Finance', 'Money', 'Investing', 'Education', 'Learning', 'Courses',
  'Entertainment', 'Media', 'Videos', 'Music', 'Games', 'Fun',
  'Sports', 'Hobbies', 'Interests', 'General', 'Miscellaneous', 'Other',
  'Reference', 'Resources', 'Tools', 'Utilities', 'Archive', 'Old'
].map(f => f.toLowerCase()); // Normalize for case-insensitive comparison

/**
 * Recursively traverses the bookmark tree to find all bookmark nodes
 * and their full folder paths.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} nodes - The bookmark tree nodes to traverse.
 * @param {string} currentPath - The path leading to the current nodes.
 * @param {Array<Object>} allBookmarks - Array to accumulate bookmark details.
 * @returns {Promise<void>}
 */
async function getAllBookmarksRecursive(nodes, currentPath, allBookmarks) {
  for (const node of nodes) {
    if (node.url) { // It's a bookmark
      allBookmarks.push({
        id: node.id,
        title: node.title,
        url: node.url,
        folderPath: currentPath || 'N/A', // Root bookmarks might not have a path
        parentId: node.parentId
      });
    }
    if (node.children && node.children.length > 0) {
      const folderName = node.title;
      // Avoid adding "Bookmarks bar" or "Other bookmarks" to the actual path
      const pathSegment = (node.id === '0' || node.id === '1' || node.id === '2' || !folderName) ? '' : folderName;
      const nextPath = currentPath ? (pathSegment ? `${currentPath}/${pathSegment}` : currentPath) : pathSegment;
      await getAllBookmarksRecursive(node.children, nextPath, allBookmarks);
    }
  }
}

/**
 * Helper to normalize folderPath by stripping 'Bookmarks bar/' if present
 * @param {string} folderPath - The folder path to normalize
 * @returns {string} - The normalized folder path
 */
function normalizeFolderPath(folderPath) {
  return folderPath.startsWith('Bookmarks bar/')
    ? folderPath.slice('Bookmarks bar/'.length)
    : folderPath;
}

/**
 * Proposes moves for existing bookmarks that are in potentially flat or
 * overly generic top-level folders.
 * This function identifies such bookmarks and uses the LLM to suggest
 * new, more hierarchical folder placements.
 *
 * @returns {Promise<Array<Object>>} A list of proposed moves. Each object contains:
 *   - bookmarkId: string
 *   - bookmarkTitle: string
 *   - bookmarkUrl: string
 *   - originalFolderPath: string
 *   - newSuggestedFolderPath: string (top suggestion from LLM)
 */
export async function proposeBookmarkMoves() {
  logger.info('Starting bookmark migration proposal process...');
  const proposedMoves = [];

  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    const allBookmarks = [];
    if (bookmarkTree && bookmarkTree.length > 0) {
      // Start traversal from children of the root to skip the root node itself in path
      for (const rootChild of bookmarkTree[0].children) {
         if (rootChild.children && rootChild.children.length > 0) {
            // Typically, 'Bookmarks bar' (id '1') or 'Other bookmarks' (id '2')
            // The first meaningful folder is a child of these.
            await getAllBookmarksRecursive(rootChild.children, rootChild.title, allBookmarks);
         } else if (rootChild.url) {
            // Bookmarks directly under root containers (e.g. directly in Bookmarks bar)
             allBookmarks.push({
                id: rootChild.id,
                title: rootChild.title,
                url: rootChild.url,
                folderPath: rootChild.title, // or a more appropriate root name
                parentId: rootChild.parentId
            });
         }
      }
    }
    
    logger.debug(`Found ${allBookmarks.length} total bookmarks.`);
    // DEBUG: Print all bookmarks and their folderPath using process.stdout.write
    process.stdout.write(
      '\n=== DEBUG allBookmarks ===\n' +
      allBookmarks.map(b => `${b.title} | ${b.folderPath}`).join('\n') +
      '\n========================\n'
    );

    // Helper to normalize folderPath by stripping 'Bookmarks bar/' if present
    function normalizeFolderPath(folderPath) {
      return folderPath.startsWith('Bookmarks bar/')
        ? folderPath.slice('Bookmarks bar/'.length)
        : folderPath;
    }

    // When analyzing bookmarks, use normalized folderPath
    const normalizedBookmarks = allBookmarks.map(b => ({
      ...b,
      normalizedFolderPath: normalizeFolderPath(b.folderPath),
    }));

    let candidateCount = 0;
    for (const bookmark of normalizedBookmarks) {
      const folderPathParts = parseCategoryPath(bookmark.normalizedFolderPath);
      const folderNameLower = folderPathParts.length > 0 ? folderPathParts[0].toLowerCase() : '';

      // Check if bookmark is in a single-level generic folder
      if (folderPathParts.length === 1 && GENERIC_TOP_LEVEL_FOLDERS.includes(folderNameLower)) {
        candidateCount++;
        logger.debug(`Candidate for re-classification: "${bookmark.title}" in folder "${bookmark.normalizedFolderPath}"`);

        // Prepare metadata for re-classification
        // Note: mainContent and other detailed metadata might not be available
        // for existing bookmarks without re-fetching pages, which is out of scope for this script.
        // We'll rely on title, URL, and existing path for LLM context.
        const metadata = {
          title: bookmark.title,
          url: bookmark.url,
          domain: new URL(bookmark.url).hostname,
          description: '', // Not readily available for existing bookmarks
          heading: '',     // Not readily available
          urlPath: new URL(bookmark.url).pathname.split('/').filter(p => p),
          mainContent: `Existing folder: ${bookmark.normalizedFolderPath}` // Add hint about current placement
        };

        try {
          const suggestions = await getFolderPathFromLLM(metadata);
          if (suggestions && suggestions.length > 0) {
            const topSuggestion = suggestions[0].folderPath;
            // Only propose if the new path is different and deeper or more specific
            const newPathParts = parseCategoryPath(topSuggestion);
            if (topSuggestion.toLowerCase() !== bookmark.normalizedFolderPath.toLowerCase() && 
                (newPathParts.length > folderPathParts.length || !GENERIC_TOP_LEVEL_FOLDERS.includes(newPathParts[0].toLowerCase()))) {
              proposedMoves.push({
                bookmarkId: bookmark.id,
                bookmarkTitle: bookmark.title,
                bookmarkUrl: bookmark.url,
                originalFolderPath: bookmark.normalizedFolderPath,
                newSuggestedFolderPath: topSuggestion,
                confidence: suggestions[0].confidence
              });
              logger.info(`Proposed move for "${bookmark.title}": FROM "${bookmark.normalizedFolderPath}" TO "${topSuggestion}"`);
            } else {
              logger.debug(`Skipping proposal for "${bookmark.title}", new suggestion "${topSuggestion}" is not better.`);
            }
          }
        } catch (error) {
          logger.error(`Error re-classifying bookmark ID ${bookmark.id} ("${bookmark.title}"):`, error);
          // Continue with the next bookmark
        }
      }
    }
    logger.info(`Identified ${candidateCount} candidates for re-classification. Generated ${proposedMoves.length} potential moves.`);

  } catch (error) {
    logger.error('Error during bookmark migration proposal:', error);
    // Return whatever was collected so far, or an empty array
  }

  return proposedMoves;
}

/**
 * Executes the migration for approved moves
 * @param {Array<Object>} approvedMoves - Array of approved move proposals
 * @returns {Promise<Object>} Migration results with success/failure counts
 */
export async function executeMigration(approvedMoves) {
  logger.info(`Starting migration execution for ${approvedMoves.length} approved moves...`);
  
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  for (const move of approvedMoves) {
    try {
      logger.debug(`Processing migration for bookmark "${move.bookmarkTitle}" from "${move.originalFolderPath}" to "${move.newSuggestedFolderPath}"`);

      // Create the new folder structure if it doesn't exist
      const newFolderId = await findOrCreateFolder(move.newSuggestedFolderPath);
      
      if (!newFolderId) {
        throw new Error(`Failed to create or find folder: ${move.newSuggestedFolderPath}`);
      }

      // Move the bookmark to the new folder
      await chrome.bookmarks.move(move.bookmarkId, { parentId: newFolderId });
      
      results.successful++;
      logger.info(`Successfully moved "${move.bookmarkTitle}" to "${move.newSuggestedFolderPath}"`);
      
    } catch (error) {
      results.failed++;
      const errorMessage = `Failed to move "${move.bookmarkTitle}": ${error.message}`;
      results.errors.push(errorMessage);
      logger.error(errorMessage, error);
    }
  }

  logger.info(`Migration completed. Successful: ${results.successful}, Failed: ${results.failed}`);
  return results;
}

/**
 * Performs a complete migration workflow with user interaction
 * This is the main function that orchestrates the entire migration process
 * @param {Function} userReviewCallback - Function that handles user review of proposals
 * @returns {Promise<Object>} Complete migration results
 */
export async function performMigrationWorkflow(userReviewCallback) {
  logger.info('Starting complete migration workflow...');
  
  try {
    // Step 1: Generate migration proposals
    const proposals = await proposeBookmarkMoves();
    
    if (proposals.length === 0) {
      logger.info('No migration proposals generated. Migration workflow complete.');
      return {
        phase: 'complete',
        proposals: 0,
        approved: 0,
        successful: 0,
        failed: 0,
        message: 'No bookmarks need migration to hierarchical folders.'
      };
    }

    // Step 2: Present proposals for user review
    const approvedMoves = await userReviewCallback(proposals);
    
    if (!approvedMoves || approvedMoves.length === 0) {
      logger.info('No moves approved by user. Migration cancelled.');
      return {
        phase: 'cancelled',
        proposals: proposals.length,
        approved: 0,
        successful: 0,
        failed: 0,
        message: 'Migration cancelled by user.'
      };
    }

    // Step 3: Execute approved migrations
    const executionResults = await executeMigration(approvedMoves);
    
    return {
      phase: 'complete',
      proposals: proposals.length,
      approved: approvedMoves.length,
      successful: executionResults.successful,
      failed: executionResults.failed,
      errors: executionResults.errors,
      message: `Migration complete. ${executionResults.successful} successful, ${executionResults.failed} failed.`
    };

  } catch (error) {
    logger.error('Error during migration workflow:', error);
    return {
      phase: 'error',
      proposals: 0,
      approved: 0,
      successful: 0,
      failed: 0,
      error: error.message,
      message: 'Migration workflow encountered an error.'
    };
  }
}

/**
 * Simple console-based user review mechanism for testing
 * @param {Array<Object>} proposals - Migration proposals to review
 * @returns {Promise<Array<Object>>} Approved moves
 */
export async function consoleReviewMechanism(proposals) {
  logger.info('\n=== MIGRATION REVIEW ===');
  logger.info(`${proposals.length} migration proposals found:`);
  
  proposals.forEach((proposal, index) => {
    logger.info(`\n${index + 1}. "${proposal.bookmarkTitle}"`);
    logger.info(`   URL: ${proposal.bookmarkUrl}`);
    logger.info(`   FROM: ${proposal.originalFolderPath}`);
    logger.info(`   TO: ${proposal.newSuggestedFolderPath} (${Math.round(proposal.confidence * 100)}% confidence)`);
  });
  
  logger.info('\n=== AUTO-APPROVING ALL FOR TESTING ===');
  logger.info('In a real implementation, this would prompt the user for approval.');
  
  // For testing purposes, auto-approve all proposals
  // In a real implementation, this would present a UI for user approval
  return proposals;
}

// Example usage for testing
if (typeof window !== 'undefined' && window.chrome && window.chrome.bookmarks) {
  // Only expose in browser context
  window.testMigration = async function() {
    logger.info('Testing migration workflow...');
    const result = await performMigrationWorkflow(consoleReviewMechanism);
    logger.info('Migration test result:', result);
    return result;
  };
} 