import { config, isDebugMode, getLogLevel } from '../config/index.js';
import { getErrorSeverity } from './errors.js';

/**
 * Log levels in order of severity
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

/**
 * Maps string log levels to numeric values
 */
const LogLevelMap = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
  'critical': LogLevel.CRITICAL
};

/**
 * Logger class for consistent logging across the extension
 */
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Maximum logs to keep in memory
    this.listeners = [];
  }
  
  /**
   * Get current log level from configuration
   */
  getCurrentLogLevel() {
    const configLevel = getLogLevel();
    return LogLevelMap[configLevel] || LogLevel.INFO;
  }
  
  /**
   * Check if a log level should be logged
   */
  shouldLog(level) {
    return level >= this.getCurrentLogLevel();
  }
  
  /**
   * Format log entry
   */
  formatLogEntry(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: Object.keys(LogLevel).find(key => LogLevel[key] === level),
      message,
      context,
      stack: new Error().stack // Capture stack trace for debugging
    };
  }
  
  /**
   * Core logging method
   */
  log(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const entry = this.formatLogEntry(level, message, context);
    
    // Store in memory (circular buffer)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Console output with styling
    this.consoleOutput(entry);
    
    // Notify listeners
    this.notifyListeners(entry);
    
    // Persist critical errors
    if (level >= LogLevel.ERROR && config.get('features.enableLogging')) {
      this.persistLog(entry);
    }
  }
  
  /**
   * Console output with appropriate styling
   */
  consoleOutput(entry) {
    const styles = {
      DEBUG: 'color: #888; font-style: italic;',
      INFO: 'color: #333;',
      WARN: 'color: #ff9800; font-weight: bold;',
      ERROR: 'color: #f44336; font-weight: bold;',
      CRITICAL: 'color: #fff; background-color: #f44336; font-weight: bold; padding: 2px 4px;'
    };
    
    const style = styles[entry.level] || '';
    const prefix = `[${entry.timestamp}] [${entry.level}]`;
    
    if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
      console.error(`%c${prefix}`, style, entry.message, entry.context);
    } else if (entry.level === 'WARN') {
      console.warn(`%c${prefix}`, style, entry.message, entry.context);
    } else {
      console.log(`%c${prefix}`, style, entry.message, entry.context);
    }
  }
  
  /**
   * Persist log to storage
   */
  async persistLog(entry) {
    try {
      const key = `log_${Date.now()}`;
      const storedLogs = await chrome.storage.local.get(['errorLogs']);
      const logs = storedLogs.errorLogs || [];
      
      logs.push(entry);
      
      // Keep only recent logs (last 100)
      const recentLogs = logs.slice(-100);
      
      await chrome.storage.local.set({ errorLogs: recentLogs });
    } catch (error) {
      // Don't throw if logging fails - avoid infinite loops
      console.error('Failed to persist log:', error);
    }
  }
  
  /**
   * Log methods for different levels
   */
  debug(message, context) {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message, context) {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message, context) {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message, context) {
    this.log(LogLevel.ERROR, message, context);
  }
  
  critical(message, context) {
    this.log(LogLevel.CRITICAL, message, context);
  }
  
  /**
   * Log an error object with appropriate level
   */
  logError(error, context = {}) {
    const severity = getErrorSeverity(error);
    const level = {
      'low': LogLevel.WARN,
      'medium': LogLevel.ERROR,
      'high': LogLevel.ERROR,
      'critical': LogLevel.CRITICAL
    }[severity] || LogLevel.ERROR;
    
    const errorContext = {
      ...context,
      errorName: error.name,
      errorCode: error.code,
      errorDetails: error.details,
      stack: error.stack
    };
    
    this.log(level, error.message, errorContext);
  }
  
  /**
   * Add a log listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  /**
   * Remove a log listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }
  
  /**
   * Notify all listeners of a new log entry
   */
  notifyListeners(entry) {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Log listener error:', error);
      }
    });
  }
  
  /**
   * Get recent logs
   */
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }
  
  /**
   * Clear in-memory logs
   */
  clearLogs() {
    this.logs = [];
  }
  
  /**
   * Export logs for debugging
   */
  async exportLogs() {
    const storedLogs = await chrome.storage.local.get(['errorLogs']);
    return {
      memoryLogs: this.logs,
      persistedLogs: storedLogs.errorLogs || []
    };
  }
}

export { Logger };
export default Logger;

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const debug = (...args) => logger.debug(...args);
export const info = (...args) => logger.info(...args);
export const warn = (...args) => logger.warn(...args);
export const error = (...args) => logger.error(...args);
export const critical = (...args) => logger.critical(...args);
export const logError = (...args) => logger.logError(...args); 