// lib/bookmarks.js - Complete implementation
let folderCache = null;
let cacheTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function createBookmarkInFolder(folderPath, title, url) {
  const folderId = await ensureFolderExists(folderPath);
  
  // Check for existing bookmark
  const existing = await chrome.bookmarks.search({ url });
  
  if (existing.length > 0) {
    // Update existing bookmark
    await chrome.bookmarks.update(existing[0].id, { title });
    return existing[0];
  }
  
  // Create new bookmark
  return await chrome.bookmarks.create({
    parentId: folderId,
    title,
    url
  });
}

async function ensureFolderExists(path) {
  const parts = path.split('/').filter(p => p.length > 0);
  let parentId = '1'; // Bookmarks bar
  
  for (const folderName of parts) {
    parentId = await findOrCreateFolder(parentId, folderName);
  }
  
  return parentId;
}

async function findOrCreateFolder(parentId, folderName) {
  const children = await chrome.bookmarks.getChildren(parentId);
  const existing = children.find(
    node => !node.url && node.title.toLowerCase() === folderName.toLowerCase()
  );
  
  if (existing) {
    return existing.id;
  }
  
  const newFolder = await chrome.bookmarks.create({
    parentId,
    title: folderName
  });
  
  // Invalidate cache when structure changes
  folderCache = null;
  
  return newFolder.id;
}

export async function getFolderStructure() {
  const now = Date.now();
  
  // Force cache refresh after root container logic fix
  folderCache = null;
  cacheTime = 0;
  
  if (folderCache && (now - cacheTime) < CACHE_DURATION) {
    return folderCache;
  }
  
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  
  function traverse(node, path = '') {
    if (!node.url && node.title) {
      const currentPath = path ? `${path}/${node.title}` : node.title;
      const isRootContainer = ['Bookmarks Bar', 'Other Bookmarks', 'Mobile Bookmarks', 'Favorites Bar'].includes(node.title);
      
      // Skip root containers from folder list
      if (!isRootContainer) {
        folders.push(currentPath);
      }
      
      if (node.children) {
        // For root containers, traverse children with empty path
        const pathForChildren = isRootContainer ? '' : currentPath;
        node.children.forEach(child => traverse(child, pathForChildren));
      }
    } else if (node.children) {
      node.children.forEach(child => traverse(child, path));
    }
  }
  
  traverse(tree[0]);
  
  folderCache = folders;
  cacheTime = now;
  
  return folders;
}