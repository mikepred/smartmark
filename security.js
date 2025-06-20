class SecuritySanitizer {
  static sanitizeForPrompt(input) {
    if (typeof input !== 'string') return '';
    
    // Unicode normalization to prevent bypass attempts
    let sanitized = input.normalize('NFKC');
    
    // Remove control characters and dangerous Unicode ranges
    sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Remove bidirectional text override characters
    sanitized = sanitized.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
    
    // Remove zero-width characters that could hide malicious content
    sanitized = sanitized.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
    
    // Standard dangerous character removal
    sanitized = sanitized
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[<>'"\\`]/g, '')
      .replace(/[\{\}\[\]]/g, '') // Remove JSON delimiters
      .replace(/---|===|___/g, '') // Remove potential boundary markers
      .trim();
    
    // Additional context-aware filtering
    if (this.containsPromptInjectionPatterns(sanitized)) {
      sanitized = this.removePromptInjectionPatterns(sanitized);
    }
    
    return sanitized.substring(0, 300);
  }
  
  static containsPromptInjectionPatterns(text) {
    const patterns = [
      /system:?\s*you\s+are/i,
      /ignore\s+(previous|above|all)/i,
      /forget\s+(instructions|everything)/i,
      /new\s+instructions?/i,
      /role\s*:\s*(assistant|system|user)/i,
      /\[\/?(system|user|assistant)\]/i,
      /prompt\s*[:=]\s*/i
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
  
  static removePromptInjectionPatterns(text) {
    // Replace potential injection patterns with safe alternatives
    return text
      .replace(/system:?\s*you\s+are/gi, 'content about')
      .replace(/ignore\s+(previous|above|all)/gi, 'regarding $1')
      .replace(/forget\s+(instructions|everything)/gi, 'remember $1')
      .replace(/new\s+instructions?/gi, 'additional information')
      .replace(/role\s*:\s*(assistant|system|user)/gi, 'type: $1')
      .replace(/\[\/?(system|user|assistant)\]/gi, '($1)')
      .replace(/prompt\s*[:=]\s*/gi, 'text: ');
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