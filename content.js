// File: content.js (updated for Task 9)

/**
 * Extracts comprehensive metadata from the current page and sends it to the background script.
 * The returned object remains available as the executeScript return value for backward compatibility.
 */
function extractPageMetadata() {
  const pageUrl = window.location.href;
  const url = new URL(pageUrl);

  // Helper to safely read meta tag content
  const getMetaContent = (name) => {
    const el = document.querySelector(`meta[name="${name}"]`);
    return el ? el.content.trim() : '';
  };

  const getKeywords = () => getMetaContent('keywords');

  const getDescription = () => getMetaContent('description');

  const getHeading = () => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.textContent.trim() : '';
  };

  const getAuthor = () => {
    // Check meta tags first (most reliable)
    const metaAuthor = getMetaContent('author') || 
                      document.querySelector('meta[property="article:author"]')?.content;
    if (metaAuthor) return metaAuthor.trim();
    
    // Try JSON-LD structured data
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const data = JSON.parse(script.textContent);
        // Handle different JSON-LD structures
        if (data.author) {
          if (typeof data.author === 'string') return data.author.trim();
          if (data.author.name) return data.author.name.trim();
          if (Array.isArray(data.author) && data.author[0]?.name) return data.author[0].name.trim();
        }
      }
    } catch (e) { /* ignore JSON parsing errors */ }
    
    // Check common CSS selectors
    const authorSelectors = '.author, .byline, [rel="author"], .post-author, .article-author, .author-name';
    const authorEl = document.querySelector(authorSelectors);
    if (authorEl) {
      const authorText = authorEl.textContent.trim();
      // Filter out common prefixes like "By:", "Author:", etc.
      return authorText.replace(/^(by|author|written by):\s*/i, '').trim();
    }
    
    // Pattern matching for "By [Name]" in the first few paragraphs
    const firstParagraphs = Array.from(document.querySelectorAll('p')).slice(0, 3);
    for (const p of firstParagraphs) {
      const text = p.textContent;
      const byMatch = text.match(/\b(?:by|author|written by)\s+([A-Za-z][A-Za-z\s.]{1,40})\b/i);
      if (byMatch) {
        const author = byMatch[1].trim();
        // Basic validation - ensure it looks like a name
        if (author.length > 1 && author.length < 50 && !/\d/.test(author)) {
          return author;
        }
      }
    }
    
    return '';
  };

  const getPublicationDate = () => {
    // Check structured meta tags (most reliable)
    const publishedTime = document.querySelector('meta[property="article:published_time"]')?.content ||
                         document.querySelector('meta[name="article:published_time"]')?.content ||
                         document.querySelector('meta[property="article:published"]')?.content ||
                         document.querySelector('meta[name="date"]')?.content ||
                         document.querySelector('meta[name="publication-date"]')?.content ||
                         document.querySelector('meta[name="publish-date"]')?.content;
    if (publishedTime) return publishedTime.trim();
    
    // Check time elements with datetime attribute
    const timeEl = document.querySelector('time[datetime]');
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) return datetime.trim();
    }
    
    // Try JSON-LD structured data
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const data = JSON.parse(script.textContent);
        // Handle different JSON-LD date properties
        if (data.datePublished) return data.datePublished;
        if (data.dateCreated) return data.dateCreated;
        if (data.publishedDate) return data.publishedDate;
        
        // Handle nested article objects
        if (data['@type'] === 'Article' || data.mainEntity?.['@type'] === 'Article') {
          const article = data['@type'] === 'Article' ? data : data.mainEntity;
          if (article.datePublished) return article.datePublished;
          if (article.dateCreated) return article.dateCreated;
        }
      }
    } catch (e) { /* ignore JSON parsing errors */ }
    
    // Look for common date patterns in specific elements
    const dateSelectors = '.published, .date-published, .publish-date, .post-date, .article-date, .entry-date';
    const dateEl = document.querySelector(dateSelectors);
    if (dateEl) {
      // Try to extract datetime attribute first
      const datetime = dateEl.getAttribute('datetime') || dateEl.getAttribute('data-datetime');
      if (datetime) return datetime.trim();
      
      // Fall back to text content, but validate it looks like a date
      const dateText = dateEl.textContent.trim();
      if (dateText && dateText.length < 50 && /\d{4}/.test(dateText)) {
        return dateText;
      }
    }
    
    return '';
  };

  const getMainContent = () => {
    // Enhanced content extraction with noise filtering
    const noiseSelectors = 'nav, header, footer, aside, .ad, .advertisement, .sidebar, .comments, .social, .navigation, .menu, .widget, .related, .share, .breadcrumb, .pagination, script, style, .cookie-notice, .popup, .modal, .overlay';
    
    // Try semantic elements first (highest priority)
    const semanticContent = document.querySelector('article, main, [role="main"]');
    if (semanticContent) {
      // Filter out noise elements within the semantic content
      const clone = semanticContent.cloneNode(true);
      clone.querySelectorAll(noiseSelectors).forEach(el => el.remove());
      const text = clone.innerText;
      if (text && text.trim().length > 100) { // Ensure meaningful content
        return text.substring(0, 8000).trim();
      }
    }
    
    // Fallback to content containers, but filter noise
    const contentSelectors = '.post-content, .entry-content, .content, .article-content, .page-content, .main-content, .post-body, .entry-body';
    const contentElements = document.querySelectorAll(contentSelectors);
    if (contentElements.length) {
      let text = '';
      contentElements.forEach(el => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll(noiseSelectors).forEach(noise => noise.remove());
        const elementText = clone.innerText;
        if (elementText && elementText.trim().length > 50) { // Filter out trivial content
          text += elementText + '\n';
        }
      });
      if (text.trim().length > 100) {
        return text.substring(0, 8000).trim();
      }
    }
    
    // Try paragraph-based extraction from semantic containers
    const paragraphContainers = document.querySelectorAll('article, main, .content, .post, .entry, [role="main"]');
    if (paragraphContainers.length) {
      let text = '';
      paragraphContainers.forEach(container => {
        const paragraphs = container.querySelectorAll('p');
        paragraphs.forEach(p => {
          // Skip paragraphs that are likely navigation or boilerplate
          if (p.textContent.trim().length > 20 && 
              !p.closest('nav, header, footer, aside, .sidebar, .menu')) {
            text += p.textContent + '\n';
          }
        });
      });
      if (text.trim().length > 100) {
        return text.substring(0, 8000).trim();
      }
    }
    
    // Last resort: body text with aggressive noise removal
    if (document.body) {
      const bodyClone = document.body.cloneNode(true);
      
      // Remove all noise elements
      bodyClone.querySelectorAll(noiseSelectors).forEach(el => el.remove());
      
      // Also remove elements with specific attributes that indicate non-content
      bodyClone.querySelectorAll('[class*="ad"], [id*="ad"], [class*="banner"], [class*="popup"], [class*="modal"]').forEach(el => el.remove());
      
      // Get text and apply basic filtering
      let text = bodyClone.innerText;
      
      // Remove common boilerplate patterns
      text = text.replace(/^(Home|Menu|Navigation|Search|Login|Sign up|Subscribe|Follow us)[\s\S]*$/gim, '');
      text = text.replace(/Copyright.*$/gim, '');
      text = text.replace(/All rights reserved.*$/gim, '');
      text = text.replace(/Terms of Service.*$/gim, '');
      text = text.replace(/Privacy Policy.*$/gim, '');
      
      return text.substring(0, 8000).trim();
    }
    
    return '';
  };

  return {
    title: document.title.trim(),
    url: pageUrl,
    domain: url.hostname,
    description: getDescription(),
    heading: getHeading(),
    author: getAuthor(),
    // First two path segments for context (array expected by downstream code)
    urlPath: url.pathname.split('/').filter(Boolean).slice(0, 2),
    keywords: getKeywords(),
    mainContent: getMainContent(),
    publishedDate: getPublicationDate(),
  };
}

// Execute the metadata extraction in an isolated scope to prevent variable
// collisions if the script is injected multiple times. The IIFE returns the
// metadata object so `chrome.scripting.executeScript` still receives a result
// for backward compatibility.

(() => {
  const metadata = extractPageMetadata();

  // Send metadata to background script for the new messaging flow
  chrome.runtime.sendMessage({
    action: 'extractedFullMetadata',
    data: metadata,
  });

  // Returning metadata keeps current background logic functional
  return metadata;
})();
