// File: utils/ui.js

/**
 * Displays a message to the user in a specified element
 * @param {HTMLElement} element - The DOM element to display the message in
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 */
export function displayMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#d32f2f' : '#2e7d32';
}

/**
 * Clears the message in a specified element after a delay
 * @param {HTMLElement} element - The DOM element to clear
 * @param {number} delay - Delay in milliseconds before clearing the message
 */
export function clearMessage(element, delay = 2000) {
  setTimeout(() => {
    element.textContent = '';
    element.style.color = '';
  }, delay);
}

/**
 * Toggles the state of a button
 * @param {HTMLElement} button - The button element to toggle
 * @param {boolean} disabled - Whether the button should be disabled
 * @param {string} text - The text to set on the button
 */
export function toggleButtonState(button, disabled, text) {
  button.disabled = disabled;
  button.textContent = text;
}
