// lib/ai.js - Complete implementation
import { getConfig } from './storage.js';

const PROVIDERS = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    async call(prompt, config) {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    }
  },
  
  lmstudio: {
    async call(prompt, config) {
      const response = await fetch(`http://${config.host}:${config.port}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'local-model',
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
  },
  
  openai: {
    async call(prompt, config) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: config.openaiModel || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  
  anthropic: {
    async call(prompt, config) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.anthropicModel || 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.content[0].text;
    }
  },
  
  openrouter: {
    async call(prompt, config) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'HTTP-Referer': 'https://smartmark-extension.com',
          'X-Title': 'SmartMark Extension'
        },
        body: JSON.stringify({
          model: config.openrouterModel || 'anthropic/claude-3-haiku',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  
  together: {
    async call(prompt, config) {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.togetherApiKey}`
        },
        body: JSON.stringify({
          model: config.togetherModel || 'meta-llama/Llama-3-8b-chat-hf',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`Together AI API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  
  perplexity: {
    async call(prompt, config) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.perplexityApiKey}`
        },
        body: JSON.stringify({
          model: config.perplexityModel || 'llama-3.1-sonar-small-128k-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  
  groq: {
    async call(prompt, config) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.groqApiKey}`
        },
        body: JSON.stringify({
          model: config.groqModel || 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  
  mistral: {
    async call(prompt, config) {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.mistralApiKey}`
        },
        body: JSON.stringify({
          model: config.mistralModel || 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  
  cohere: {
    async call(prompt, config) {
      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.cohereApiKey}`
        },
        body: JSON.stringify({
          model: config.cohereModel || 'command-r',
          message: prompt,
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.text;
    }
  }
};

export async function classifyBookmark(metadata) {
  const config = await getConfig();
  const provider = PROVIDERS[config.provider];
  
  if (!provider) {
    throw new Error(`Unknown provider: ${config.provider}`);
  }
  
  const prompt = buildPrompt(metadata);
  const response = await provider.call(prompt, config);
  
  return parseResponse(response);
}

function buildPrompt(metadata) {
  return `You MUST classify this bookmark into a deep 3-level folder hierarchy. Always use the format: MainCategory/Subcategory/SpecificTopic

Title: ${metadata.title}
URL: ${metadata.url}
Description: ${metadata.description}
Content: ${metadata.content}

CRITICAL: Each folderPath must have exactly 3 levels separated by forward slashes.
Examples of correct 3-level paths:
- "Technology/Programming/JavaScript"
- "Entertainment/Movies/Action Films"
- "Education/Science/Physics"

Return ONLY a JSON array with this exact format:
[{"folderPath":"MainCategory/Subcategory/SpecificTopic","confidence":0.9}]

Provide exactly 5 suggestions with 3-level folder paths.`;
}

function parseResponse(response) {
  try {
    // Extract JSON array from response
    const match = response.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found');
    
    const suggestions = JSON.parse(match[0]);
    
    // Validate and sanitize
    return suggestions
      .filter(s => s.folderPath && s.confidence)
      .map(s => ({
        folderPath: sanitizeFolderPath(s.folderPath),
        confidence: Math.min(1, Math.max(0, s.confidence))
      }))
      .slice(0, 5);
  } catch (error) {
    console.error('Parse error:', error);
    return [{ folderPath: 'Uncategorized', confidence: 0.5 }];
  }
}

function sanitizeFolderPath(path) {
  const parts = path
    .replace(/[<>:"|?*\\]/g, '')
    .replace(/\.\./g, '')
    .split('/')
    .map(part => {
      // Add spaces before capital letters to fix concatenated words
      return part.trim()
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
    })
    .filter(part => part.length > 0)
    .slice(0, 3);
  
  // Ensure exactly 3 levels - pad with "General" if needed
  while (parts.length < 3) {
    parts.push('General');
  }
  
  return parts.join('/');
}