import { config } from './index.js';

/**
 * Migration utility for transitioning existing settings to the new configuration system
 */

// Old storage keys mapped to new configuration paths
const MIGRATION_MAP = {
  // API settings
  'apiKey': 'storage.keys.apiKey',
  'aiProvider': 'api.defaultProvider',
  'lmstudioHost': 'api.lmstudio.host',
  'lmstudioPort': 'api.lmstudio.port',
  'ollamaHost': 'api.ollama.host',
  'ollamaPort': 'api.ollama.port',
  
  // Cache settings
  'bookmarkFolderStructure': 'storage.keys.bookmarkCache',
  'bookmarkFolderStructureExpiry': 'storage.keys.cacheTimestamp'
};

/**
 * Migrates existing settings from old storage keys to new configuration system
 * @returns {Promise<object>} Migration report with details of what was migrated
 */
export async function migrateSettings() {
  const report = {
    migrated: [],
    failed: [],
    skipped: []
  };

  try {
    // Get all existing storage data
    const allData = await chrome.storage.local.get(null);
    
    // Check if migration has already been done
    if (allData._configMigrationComplete) {
      report.skipped.push('Migration already completed');
      return report;
    }

    // Iterate through old keys and migrate them
    for (const [oldKey, newPath] of Object.entries(MIGRATION_MAP)) {
      if (oldKey in allData) {
        try {
          // Special handling for different types of migrations
          if (oldKey === 'aiProvider') {
            // Convert old provider names if needed
            const providerMap = {
              'gemini': 'gemini',
              'lmstudio': 'lmstudio',
              'ollama': 'ollama'
            };
            const mappedProvider = providerMap[allData[oldKey]] || 'gemini';
            await config.saveOverrides({ 
              api: { defaultProvider: mappedProvider } 
            });
            report.migrated.push(`${oldKey} -> ${newPath}`);
          } else if (oldKey.includes('Host') || oldKey.includes('Port')) {
            // Handle host/port configurations
            const provider = oldKey.includes('lmstudio') ? 'lmstudio' : 'ollama';
            const setting = oldKey.includes('Host') ? 'host' : 'port';
            await config.saveOverrides({
              api: {
                [provider]: {
                  [setting]: allData[oldKey]
                }
              }
            });
            report.migrated.push(`${oldKey} -> api.${provider}.${setting}`);
          } else {
            // For other keys, just note them (actual data remains in old location)
            report.migrated.push(`${oldKey} (preserved in original location)`);
          }
        } catch (error) {
          report.failed.push({
            key: oldKey,
            error: error.message
          });
        }
      }
    }

    // Mark migration as complete
    await chrome.storage.local.set({ _configMigrationComplete: true });
    
    console.log('Settings migration completed:', report);
    return report;

  } catch (error) {
    console.error('Settings migration failed:', error);
    throw error;
  }
}

/**
 * Checks if settings migration is needed
 * @returns {Promise<boolean>} True if migration is needed
 */
export async function isMigrationNeeded() {
  try {
    const result = await chrome.storage.local.get(['_configMigrationComplete']);
    return !result._configMigrationComplete;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Rolls back the migration (for testing/debugging)
 * @returns {Promise<void>}
 */
export async function rollbackMigration() {
  try {
    await chrome.storage.local.remove(['_configMigrationComplete', 'configOverrides']);
    await config.reset();
    console.log('Migration rolled back successfully');
  } catch (error) {
    console.error('Error rolling back migration:', error);
    throw error;
  }
} 