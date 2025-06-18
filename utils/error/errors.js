/**
 * Custom error classes for SmartMark extension
 * Provides a hierarchy of error types for better error handling
 */

/**
 * Base error class for all SmartMark errors
 */
export class SmartMarkError extends Error {
  constructor(message, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert error to a plain object for storage/transmission
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * API-related errors
 */
export class APIError extends SmartMarkError {
  constructor(message, provider = null, statusCode = null, details = null) {
    super(message, `API_${provider?.toUpperCase() || 'UNKNOWN'}_ERROR`, details);
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends SmartMarkError {
  constructor(message, configKey = null) {
    super(message, 'CONFIG_ERROR', { configKey });
    this.configKey = configKey;
  }
}

/**
 * Storage-related errors
 */
export class StorageError extends SmartMarkError {
  constructor(message, operation = null, key = null) {
    super(message, 'STORAGE_ERROR', { operation, key });
    this.operation = operation;
    this.key = key;
  }
}

/**
 * Bookmark operation errors
 */
export class BookmarkError extends SmartMarkError {
  constructor(message, operation = null, folderPath = null) {
    super(message, 'BOOKMARK_ERROR', { operation, folderPath });
    this.operation = operation;
    this.folderPath = folderPath;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends SmartMarkError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.field = field;
    this.value = value;
  }
}

/**
 * Extension runtime errors
 */
export class ExtensionError extends SmartMarkError {
  constructor(message, component = null) {
    super(message, 'EXTENSION_ERROR', { component });
    this.component = component;
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends SmartMarkError {
  constructor(message, url = null, method = null) {
    super(message, 'NETWORK_ERROR', { url, method });
    this.url = url;
    this.method = method;
  }
}

/**
 * Content script errors
 */
export class ContentScriptError extends SmartMarkError {
  constructor(message, tabId = null) {
    super(message, 'CONTENT_SCRIPT_ERROR', { tabId });
    this.tabId = tabId;
  }
}

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Maps error types to severity levels
 */
export const ErrorSeverityMap = {
  [ValidationError.name]: ErrorSeverity.LOW,
  [StorageError.name]: ErrorSeverity.MEDIUM,
  [BookmarkError.name]: ErrorSeverity.MEDIUM,
  [ConfigurationError.name]: ErrorSeverity.HIGH,
  [APIError.name]: ErrorSeverity.HIGH,
  [NetworkError.name]: ErrorSeverity.HIGH,
  [ContentScriptError.name]: ErrorSeverity.HIGH,
  [ExtensionError.name]: ErrorSeverity.CRITICAL
};

/**
 * Get severity level for an error
 */
export function getErrorSeverity(error) {
  if (error instanceof SmartMarkError) {
    return ErrorSeverityMap[error.constructor.name] || ErrorSeverity.MEDIUM;
  }
  return ErrorSeverity.MEDIUM;
} 