// File: utils/bookmark.js

import { config, getStorageKey } from './config/index.js';

/**
 * Splits a bookmark category path string into an array of normalized parts.
 * Normalization rule: capitalize first character of each part for consistency.
 *
 * @example
 *   parseCategoryPath('tech/ai/llms') => ['Tech', 'Ai', 'Llms']
 *   parseCategoryPath('Tech/AI')       => ['Tech', 'AI']
 * @param {string} path - Category path string using `/` as separator
 * @returns {string[]} Normalized array of category parts
 */
export function parseCategoryPath(path = '') {
  if (typeof path !== 'string') return [];
  return path
    .split('/')
    .filter((part) => part.trim() !== '')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

/**
 * Builds a category path string from an array of parts.
 * Parts are normalized before join to ensure consistency.
 *
 * @example
 *   buildCategoryPath(['Tech', 'AI', 'LLMs']) => 'Tech/AI/LLMs'
 * @param {string[]} parts - Array of category parts
 * @returns {string} Normalized category path
 */
export function buildCategoryPath(parts = []) {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part) => typeof part === 'string' && part.trim() !== '')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('/');
}

/**
 * Finds or creates a folder hierarchy based on the provided path
 * @param {string} path - The folder path to find or create (e.g., "Tech/Python")
 * @param {string} [startParentId='1'] - The starting parent ID (default is Bookmarks bar)
 * @returns {Promise<string>} The ID of the final folder in the path
 */
export async function findOrCreateFolder(path, startParentId = '1') {
  const pathParts = parseCategoryPath(path);
  let parentId = startParentId;

  for (let part of pathParts) {
    const normalizedPart = part; // already normalized in parseCategoryPath

    const bookmarks = await chrome.bookmarks.getSubTree(parentId);
    let folder = bookmarks[0].children.find(
      (node) => node.title.toLowerCase() === normalizedPart.toLowerCase() && !node.url
    );

    if (folder) {
      parentId = folder.id;
    } else {
      const newFolder = await chrome.bookmarks.create({
        parentId: parentId,
        title: normalizedPart,
      });
      parentId = newFolder.id;
    }
  }
  return parentId;
}

/**
 * Creates a bookmark in the specified folder, preventing duplicates
 * @param {string} folderId - The ID of the folder to save the bookmark in
 * @param {string} title - The title of the bookmark
 * @param {string} url - The URL of the bookmark
 * @returns {Promise<object>} The created or updated bookmark object
 */
export async function createBookmark(folderId, title, url) {
  // Get all children of the target folder
  const children = await chrome.bookmarks.getChildren(folderId);
  
  // Check if a bookmark with the same URL already exists in this folder
  const existingBookmarkInFolder = children.find(child => child.url === url);

  if (existingBookmarkInFolder) {
    console.log(`Bookmark for URL ${url} already exists in folder ${folderId}. Updating title.`);
    
    // Update the existing bookmark's title if it's different
    if (existingBookmarkInFolder.title !== title) {
      const updatedBookmark = await chrome.bookmarks.update(existingBookmarkInFolder.id, { title: title });
      return updatedBookmark;
    }
    
    // Return the existing bookmark if no update was needed
    return existingBookmarkInFolder;
  } else {
    // Create new bookmark if no duplicate exists in this folder
    return await chrome.bookmarks.create({
      parentId: folderId,
      title: title,
      url: url
    });
  }
}

/**
 * Finds a bookmark by URL across all bookmarks
 * @param {string} url - The URL to search for
 * @returns {Promise<object|null>} The bookmark object if found, null otherwise
 */
export async function findBookmarkByUrl(url) {
  return new Promise((resolve) => {
    chrome.bookmarks.search({ url: url }, (results) => {
      resolve(results.length > 0 ? results[0] : null);
    });
  });
}

/**
 * Cache configuration for bookmark folder structure
 */
const CACHE_CONFIG = {
  key: getStorageKey('bookmarkCache'),
  expiryKey: getStorageKey('cacheTimestamp'),
  ttlMinutes: config.get('storage.cache.ttl') / 60000 // Convert milliseconds to minutes
};

/**
 * Recursively retrieves the Chrome bookmark folder structure and flattens it
 * into an array of full folder paths for AI context. Implements caching to
 * optimize performance and minimize repeated chrome.bookmarks API calls.
 * @param {boolean} [forceRefresh=false] - Force a fresh fetch, bypassing cache
 * @returns {Promise<string[]>} Array of folder paths (e.g., ['Tech/AI', 'News/Science'])
 */
export async function getBookmarkFolderStructure(forceRefresh = false) {
  try {
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = await getCachedFolderStructure();
      if (cachedData) {
        console.log(`Retrieved ${cachedData.length} bookmark folder paths from cache`);
        return cachedData;
      }
    }

    // Fetch fresh data from Chrome bookmarks API
    const folderPaths = await fetchBookmarkFolderStructure();
    
    // Update cache with fresh data
    await setCachedFolderStructure(folderPaths);
    
    console.log(`Retrieved ${folderPaths.length} bookmark folder paths from API (cached for ${CACHE_CONFIG.ttlMinutes} minutes)`);
    return folderPaths;

  } catch (error) {
    console.error('Error retrieving bookmark folder structure:', error);
    
    // Try to return cached data as fallback on error
    try {
      const cachedData = await getCachedFolderStructure(true); // Skip expiry check on error
      if (cachedData && cachedData.length > 0) {
        console.log('Returning cached data as fallback due to API error');
        return cachedData;
      }
    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
    }
    
    // Return empty array on error as specified in requirements
    return [];
  }
}

/**
 * Fetches bookmark folder structure from Chrome bookmarks API
 * @returns {Promise<string[]>} Array of folder paths
 */
async function fetchBookmarkFolderStructure() {
  // Get the entire bookmark tree
  const tree = await new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(results);
      }
    });
  });

  const folderPaths = [];

  /**
   * Recursively traverses bookmark nodes to build folder paths
   * @param {object[]} nodes - Array of bookmark nodes
   * @param {string} currentPath - Current path being built
   * @param {boolean} insideRootContainer - Whether we're currently inside a root container
   */
  function traverseNodes(nodes, currentPath = '', insideRootContainer = false) {
    if (!nodes || !Array.isArray(nodes)) return;

    for (const node of nodes) {
      // Skip if this is a bookmark (has URL) rather than a folder
      if (node.url) continue;

      // Skip root nodes that don't have meaningful titles
      if (node.id === '0' || !node.title || node.title.trim() === '') {
        // For root nodes, traverse children without adding to path
        if (node.children) {
          traverseNodes(node.children, currentPath, insideRootContainer);
        }
        continue;
      }

      const isRoot = isRootContainer(node.title);
      
      if (isRoot && !currentPath) {
        // This is a root container at the top level - skip it but traverse its children
        console.log(`❌ Skipping root container: "${node.title}"`);
        if (node.children && node.children.length > 0) {
          traverseNodes(node.children, '', true); // Mark that we're now inside a root container
        }
      } else if (insideRootContainer && !currentPath) {
        // We're inside a root container, so this is a direct child - add it without the root prefix
        console.log(`✅ Adding folder (root child): "${node.title}"`);
        folderPaths.push(node.title);
        
        // Recursively process children with this as the new path
        if (node.children && node.children.length > 0) {
          traverseNodes(node.children, node.title, insideRootContainer);
        }
      } else if (!insideRootContainer || currentPath) {
        // Normal folder - build the path and add it
        const newPath = currentPath ? `${currentPath}/${node.title}` : node.title;
        console.log(`✅ Adding folder: "${newPath}"`);
        folderPaths.push(newPath);
        
        // Recursively process children
        if (node.children && node.children.length > 0) {
          traverseNodes(node.children, newPath, insideRootContainer);
        }
      }
    }
  }

  /**
   * Checks if a title represents a root container that shouldn't be included
   * @param {string} title - The node title to check
   * @returns {boolean} True if this is a root container
   */
  function isRootContainer(title) {
    const rootContainers = [
      'Bookmarks bar',
      'Favorites bar',
      'Other bookmarks',
      'Other favorites',
      'Mobile bookmarks',
      'Bookmarks Menu'
    ];
    const normalizedTitle = title.trim().toLowerCase();
    return rootContainers.some(container => normalizedTitle === container.toLowerCase());
  }

  // Start traversal from the root
  traverseNodes(tree, '', false);

  // Debug logging to see what folders are being returned
  console.log('📁 Folder structure extracted:', folderPaths);
  
  return folderPaths;
}

/**
 * Retrieves cached bookmark folder structure if available and not expired
 * @param {boolean} [skipExpiryCheck=false] - Skip expiry check (for fallback scenarios)
 * @returns {Promise<string[]|null>} Cached folder paths or null if not available/expired
 */
async function getCachedFolderStructure(skipExpiryCheck = false) {
  try {
    const result = await new Promise((resolve) => {
      chrome.storage.local.get([CACHE_CONFIG.key, CACHE_CONFIG.expiryKey], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error reading from cache:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result);
        }
      });
    });

    const cachedData = result[CACHE_CONFIG.key];
    const cachedExpiry = result[CACHE_CONFIG.expiryKey];

    if (!cachedData || !Array.isArray(cachedData)) {
      return null;
    }

    // Check if cache has expired (unless we're skipping expiry check)
    if (!skipExpiryCheck) {
      if (!cachedExpiry || Date.now() > cachedExpiry) {
        console.log('Cache expired, will fetch fresh data');
        return null;
      }
    }

    return cachedData;
  } catch (error) {
    console.error('Error retrieving cached folder structure:', error);
    return null;
  }
}

/**
 * Stores bookmark folder structure in cache with expiry timestamp
 * @param {string[]} folderPaths - Array of folder paths to cache
 * @returns {Promise<void>}
 */
async function setCachedFolderStructure(folderPaths) {
  try {
    const expiryTime = Date.now() + (CACHE_CONFIG.ttlMinutes * 60 * 1000);
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({
        [CACHE_CONFIG.key]: folderPaths,
        [CACHE_CONFIG.expiryKey]: expiryTime
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    console.log(`Cached ${folderPaths.length} folder paths, expires at ${new Date(expiryTime).toLocaleString()}`);
  } catch (error) {
    console.error('Error caching folder structure:', error);
    // Don't throw error - caching failure shouldn't break the main functionality
  }
}

/**
 * Clears the bookmark folder structure cache
 * @returns {Promise<void>}
 */
export async function clearBookmarkFolderCache() {
  try {
    await new Promise((resolve, reject) => {
      chrome.storage.local.remove([CACHE_CONFIG.key, CACHE_CONFIG.expiryKey], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
    console.log('Bookmark folder cache cleared');
  } catch (error) {
    console.error('Error clearing bookmark folder cache:', error);
    throw error;
  }
}
