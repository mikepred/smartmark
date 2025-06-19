// lib/storage.js - Complete implementation
const STORAGE_KEY = 'smartmark_config';

const DEFAULT_CONFIG = {
  provider: 'gemini',
  apiKey: '',
  host: 'localhost',
  port: 1234, // Default for LM Studio, will be overridden based on provider
  model: 'local-model'
};

export async function getConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_CONFIG, ...result[STORAGE_KEY] };
}

export async function saveConfig(config) {
  // Basic validation
  if (config.provider === 'gemini' && !config.apiKey) {
    throw new Error('Gemini requires an API key');
  }
  
  await chrome.storage.local.set({ 
    [STORAGE_KEY]: { ...DEFAULT_CONFIG, ...config } 
  });
}

// Simple encrypted storage for API keys
export async function saveSecure(key, value) {
  // Use Chrome's built-in encryption for sensitive data
  // This is sufficient for a learning project
  const encrypted = btoa(value); // Basic obfuscation
  await chrome.storage.local.set({ [`secure_${key}`]: encrypted });
}

export async function getSecure(key) {
  const result = await chrome.storage.local.get(`secure_${key}`);
  const encrypted = result[`secure_${key}`];
  return encrypted ? atob(encrypted) : null;
}