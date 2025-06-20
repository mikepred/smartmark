# SmartMark (Simplified)

A simple browser extension that uses a local AI to automatically organize your bookmarks.

## Core Concept

This extension takes the current page's title and content and sends it to a locally running [LM Studio](https://lmstudio.ai/) instance to get a suggested folder path for the bookmark. It is designed to be as simple as possible, with no external dependencies or complex settings.

## Requirement

You must have **LM Studio running** on your computer for this extension to work. The extension is hardcoded to connect to `http://localhost:1234`.

## Installation

1.  Download the code from this repository (e.g., as a ZIP file and extract it).
2.  Open your Chromium-based browser (like Edge or Chrome) and navigate to the extensions page:
    *   **Edge:** `edge://extensions/`
    *   **Chrome:** `chrome://extensions/`
3.  Enable **"Developer mode"** using the toggle switch.
4.  Click the **"Load unpacked"** button.
5.  Select the folder where you downloaded and extracted the code.

The extension is now installed.

## Usage

1.  Navigate to any webpage you want to bookmark.
2.  Click the SmartMark extension icon in your browser's toolbar.
3.  The extension will display a few suggested folder paths.
4.  Select a suggestion and click "Save Bookmark".

## Project Structure

The project has been simplified to a flat structure with only the essential files:

```
smartmark/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── ai.js
├── bookmarks.js
├── icons/
│   ├── icon16.png
│   └── ...
└── LICENSE
```

## License

MIT License - see `LICENSE` file for details.

## Acknowledgments

- Google Gemini, OpenAI, Anthropic, and other AI providers
- Chrome Extensions API for bookmark management
- Open source community for development patterns