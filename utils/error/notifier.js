import { getErrorSeverity } from './errors.js';

/**
 * User notification system for error feedback
 * Provides different notification strategies based on error severity
 */

/**
 * Notification types
 */
export const NotificationType = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
};

/**
 * Notification strategies
 */
export const NotificationStrategy = {
  TOAST: 'toast',          // In-page toast notification
  BADGE: 'badge',          // Extension badge notification
  NOTIFICATION: 'notification', // Chrome notification API
  CONSOLE: 'console'       // Console only (for development)
};

/**
 * Notification manager class
 */
class NotificationManager {
  constructor() {
    this.activeNotifications = new Map();
    this.notificationQueue = [];
    this.isProcessing = false;
  }
  
  /**
   * Show a notification to the user
   */
  async notify(message, type = NotificationType.INFO, options = {}) {
    const notification = {
      id: `notification_${Date.now()}_${Math.random()}`,
      message,
      type,
      timestamp: new Date().toISOString(),
      options: {
        duration: 5000,
        strategy: NotificationStrategy.TOAST,
        ...options
      }
    };
    
    // Add to queue
    this.notificationQueue.push(notification);
    
    // Process queue
    await this.processQueue();
    
    return notification.id;
  }
  
  /**
   * Notify based on error severity
   */
  async notifyError(error, userFriendlyMessage = null) {
    const severity = getErrorSeverity(error);
    
    // Determine notification type based on severity
    const typeMap = {
      'low': NotificationType.WARNING,
      'medium': NotificationType.ERROR,
      'high': NotificationType.ERROR,
      'critical': NotificationType.ERROR
    };
    
    const type = typeMap[severity] || NotificationType.ERROR;
    
    // Determine strategy based on severity
    const strategyMap = {
      'low': NotificationStrategy.TOAST,
      'medium': NotificationStrategy.TOAST,
      'high': NotificationStrategy.NOTIFICATION,
      'critical': NotificationStrategy.NOTIFICATION
    };
    
    const strategy = strategyMap[severity] || NotificationStrategy.TOAST;
    
    // Use user-friendly message or generate one
    const message = userFriendlyMessage || this.generateUserMessage(error);
    
    return await this.notify(message, type, {
      strategy,
      duration: severity === 'critical' ? 0 : 7000, // Critical errors don't auto-dismiss
      errorDetails: error
    });
  }
  
  /**
   * Generate user-friendly error message
   */
  generateUserMessage(error) {
    // Map error types to user-friendly messages
    const messageMap = {
      'APIError': 'Unable to connect to the AI service. Please try again later.',
      'ConfigurationError': 'Configuration issue detected. Please check your settings.',
      'StorageError': 'Unable to save data. Please check your browser storage settings.',
      'BookmarkError': 'Unable to manage bookmarks. Please check your permissions.',
      'ValidationError': 'Please check your input and try again.',
      'NetworkError': 'Network connection issue. Please check your internet connection.',
      'ContentScriptError': 'Unable to read page content. Please refresh and try again.',
      'ExtensionError': 'Extension error occurred. Please restart the extension.'
    };
    
    return messageMap[error.constructor.name] || 'An unexpected error occurred. Please try again.';
  }
  
  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      await this.showNotification(notification);
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Show a notification using the specified strategy
   */
  async showNotification(notification) {
    const { strategy } = notification.options;
    
    switch (strategy) {
      case NotificationStrategy.TOAST:
        await this.showToast(notification);
        break;
      
      case NotificationStrategy.BADGE:
        await this.showBadge(notification);
        break;
      
      case NotificationStrategy.NOTIFICATION:
        await this.showChromeNotification(notification);
        break;
      
      case NotificationStrategy.CONSOLE:
      default:
        console.log(`[${notification.type.toUpperCase()}] ${notification.message}`);
        break;
    }
    
    // Track active notification
    this.activeNotifications.set(notification.id, notification);
    
    // Auto-dismiss if duration is set
    if (notification.options.duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.options.duration);
    }
  }
  
  /**
   * Show toast notification (injected into page)
   */
  async showToast(notification) {
    // Send message to content script to show toast
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'showNotification',
          notification: {
            id: notification.id,
            message: notification.message,
            type: notification.type,
            duration: notification.options.duration
          }
        });
      }
    } catch (error) {
      // Fallback to console if content script is not available
      console.log(`[${notification.type.toUpperCase()}] ${notification.message}`);
    }
  }
  
  /**
   * Show badge notification
   */
  async showBadge(notification) {
    const colorMap = {
      [NotificationType.INFO]: '#2196F3',
      [NotificationType.WARNING]: '#FF9800',
      [NotificationType.ERROR]: '#F44336',
      [NotificationType.SUCCESS]: '#4CAF50'
    };
    
    const color = colorMap[notification.type] || '#757575';
    
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text: '!' });
    
    // Clear badge after duration
    if (notification.options.duration > 0) {
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, notification.options.duration);
    }
  }
  
  /**
   * Show Chrome notification
   */
  async showChromeNotification(notification) {
    const iconMap = {
      [NotificationType.INFO]: '/icons/icon48.png',
      [NotificationType.WARNING]: '/icons/icon48.png',
      [NotificationType.ERROR]: '/icons/icon48.png',
      [NotificationType.SUCCESS]: '/icons/icon48.png'
    };
    
    const options = {
      type: 'basic',
      iconUrl: iconMap[notification.type] || '/icons/icon48.png',
      title: 'SmartMark',
      message: notification.message,
      priority: notification.type === NotificationType.ERROR ? 2 : 1
    };
    
    // Create notification
    chrome.notifications.create(notification.id, options, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to create notification:', chrome.runtime.lastError);
      }
    });
  }
  
  /**
   * Dismiss a notification
   */
  dismiss(notificationId) {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;
    
    // Clear based on strategy
    if (notification.options.strategy === NotificationStrategy.NOTIFICATION) {
      chrome.notifications.clear(notificationId);
    } else if (notification.options.strategy === NotificationStrategy.TOAST) {
      // Send message to content script to dismiss toast
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'dismissNotification',
            notificationId
          });
        }
      });
    }
    
    // Remove from active notifications
    this.activeNotifications.delete(notificationId);
  }
  
  /**
   * Dismiss all notifications
   */
  dismissAll() {
    for (const [id] of this.activeNotifications) {
      this.dismiss(id);
    }
  }
}

// Export singleton instance
export const notifier = new NotificationManager();

// Export convenience methods
export const notify = (...args) => notifier.notify(...args);
export const notifyError = (...args) => notifier.notifyError(...args);
export const dismissNotification = (id) => notifier.dismiss(id);
export const dismissAllNotifications = () => notifier.dismissAll(); 