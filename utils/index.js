/**
 * @fileoverview SmartMark Utilities Module Index
 * @module utils
 * @description Central export point for all utility modules in the SmartMark extension.
 * This module provides organized access to all utility functions and classes.
 */

// API and Provider Management
export * from './api.js';
export * from './providers/index.js';

// Business Logic
export * from './business/index.js';

// Configuration Management
export * from './config/index.js';

// Error Handling
export * from './error/index.js';
export { checkRuntimeError, handleError } from './error.js';

// Core Utilities
export * from './bookmark.js';
export * from './storage.js';
export * from './ui.js';
export * from './validation.js';

/**
 * @namespace SmartMarkUtils
 * @description The SmartMark utilities namespace provides organized access to all utility modules:
 * 
 * @property {module:api} api - API communication utilities
 * @property {module:providers} providers - AI provider implementations
 * @property {module:business} business - Business logic modules
 * @property {module:config} config - Configuration management
 * @property {module:error} error - Error handling and logging
 * @property {module:bookmark} bookmark - Bookmark management utilities
 * @property {module:storage} storage - Chrome storage utilities
 * @property {module:ui} ui - UI helper functions
 * @property {module:validation} validation - Input validation utilities
 * 
 * @example
 * // Import specific utilities
 * import { BookmarkClassifier, logger, config } from './utils/index.js';
 * 
 * @example
 * // Import entire namespace
 * import * as SmartMarkUtils from './utils/index.js';
 */ 