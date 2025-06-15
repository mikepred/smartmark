/**
 * Validation utilities for secure input handling
 */

/**
 * Sanitizes folder path to prevent injection and path traversal attacks
 * @param {string} path - The folder path to sanitize
 * @returns {string} The sanitized folder path
 * @throws {Error} If the path contains invalid characters after sanitization
 */
function sanitizeFolderPath(path) {
    if (!path || typeof path !== 'string') {
        throw new Error('Invalid folder path: path must be a non-empty string');
    }

    // Remove dangerous characters and normalize
    let sanitized = path
        // Remove Windows forbidden characters
        .replace(/[<>:"|?*\\]/g, '')
        // Remove path traversal attempts
        .replace(/\.\./g, '')
        // Remove control characters
        .replace(/[\x00-\x1f\x7f]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove leading/trailing slashes and whitespace
        .replace(/^[\/\s]+|[\/\s]+$/g, '')
        // Normalize multiple slashes
        .replace(/\/+/g, '/')
        // Limit total length
        .substring(0, 200);

    // Validate final path contains only allowed characters
    if (!/^[a-zA-Z0-9\s\-_\/&.()]+$/.test(sanitized)) {
        throw new Error('Invalid characters in folder path. Only letters, numbers, spaces, hyphens, underscores, forward slashes, ampersands, periods, and parentheses are allowed.');
    }

    // Check for empty path after sanitization
    if (!sanitized.trim()) {
        throw new Error('Folder path is empty after sanitization');
    }

    // Validate individual path parts
    const pathParts = sanitized.split('/');
    for (const part of pathParts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) {
            throw new Error('Empty folder name detected in path');
        }
        if (trimmedPart.length > 50) {
            throw new Error('Folder name too long (max 50 characters per folder)');
        }
        // Check for reserved names (Windows)
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (reservedNames.includes(trimmedPart.toUpperCase())) {
            throw new Error(`Reserved folder name detected: ${trimmedPart}`);
        }
    }

    // Limit depth to 3 levels as per business logic
    if (pathParts.length > 3) {
        throw new Error('Folder path too deep (maximum 3 levels allowed)');
    }

    return sanitized;
}

/**
 * Validates and normalizes a single folder name
 * @param {string} folderName - The folder name to validate
 * @returns {string} The normalized folder name
 * @throws {Error} If the folder name is invalid
 */
function validateFolderName(folderName) {
    if (!folderName || typeof folderName !== 'string') {
        throw new Error('Invalid folder name: must be a non-empty string');
    }

    // Normalize the folder name
    const normalized = folderName
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 50);

    if (!normalized) {
        throw new Error('Folder name is empty after normalization');
    }

    // Validate characters
    if (!/^[a-zA-Z0-9\s\-_&.()]+$/.test(normalized)) {
        throw new Error('Invalid characters in folder name');
    }

    return normalized;
}

export { sanitizeFolderPath, validateFolderName };
