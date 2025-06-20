class SecuritySanitizer {
  static sanitizeForPrompt(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[<>'"\\`]/g, '')
      .trim()
      .substring(0, 300);
  }
  
  static sanitizeFolderPath(path) {
    if (typeof path !== 'string') return 'Uncategorized';
    return path
      .replace(/[<>:"|?*\\]/g, '')
      .replace(/\.\./g, '')
      .replace(/^[\/\\]+/, '')
      .split('/')
      .map(part => part.trim().substring(0, 50))
      .filter(part => part.length > 0 && !part.startsWith('.'))
      .slice(0, 3)
      .join('/') || 'Uncategorized';
  }
  
  static validateAIResponse(response) {
    if (!Array.isArray(response)) {
      return false;
    }
    
    return response.every(item => 
      item && 
      typeof item === 'object' && 
      typeof item.folderPath === 'string' &&
      item.folderPath.length > 0 &&
      item.folderPath.length < 200
    );
  }
}