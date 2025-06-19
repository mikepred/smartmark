# SmartMark

An intelligent Chrome extension that automatically organizes bookmarks into hierarchical folder structures using AI classification. SmartMark supports 10 AI providers for flexible bookmark management across diverse AI infrastructures.

## Status

**Version**: 1.0.0  
**Architecture**: Simplified modular design with 10 core files  
**Chrome Extension**: Manifest V3 compatible  
**AI Providers**: 10 supported providers (no testing infrastructure)

## Features

- **Multi-Provider AI Integration**: 10 AI providers - Gemini, LM Studio, OpenAI, Anthropic, OpenRouter, Together AI, Perplexity, Groq, Mistral, Cohere
- **Hierarchical Folder Generation**: Creates up to 3-level deep folder structures
- **Automatic Classification**: Intelligent bookmark organization based on page content
- **Simple Configuration**: Streamlined settings with provider-specific options
- **Secure Storage**: Encrypted API key storage using Chrome's secure storage

## Architecture

SmartMark implements a **dramatically simplified architecture** with just **10 core files**:

### Extension Files
- **Service Worker** (`background.js`): Inline metadata extraction and AI classification
- **Popup Interface** (`popup.js` + `popup.html`): Main UI for bookmark classification
- **Settings Interface** (`settings.js` + `settings.html`): Provider configuration
- **Extension Manifest** (`manifest.json`): Chrome extension configuration

### Library Files (`lib/`)
- **AI Provider Logic** (`lib/ai.js`): 10 AI provider implementations with API handling
- **Bookmark Operations** (`lib/bookmarks.js`): Chrome bookmarks API wrapper
- **Storage Management** (`lib/storage.js`): Configuration and secure storage utilities

### Project Structure
```
smartmark/
├── manifest.json                 # Extension configuration
├── background.js                 # Service worker with inline metadata extraction
├── popup.html & popup.js         # Main UI interface
├── settings.html & settings.js   # Configuration interface
├── lib/                          # Library modules
│   ├── ai.js                     # 10 AI provider implementations
│   ├── bookmarks.js              # Bookmark operations
│   └── storage.js                # Configuration and storage
├── icons/                        # Extension icons
└── scripts/                      # Build and validation scripts
```

## Installation

### Prerequisites

- Google Chrome browser
- AI provider access (at least one):
  - **Gemini**: Google AI Studio API key
  - **LM Studio**: Local installation with running model
  - **OpenAI**: API key from OpenAI
  - **Anthropic**: API key from Anthropic
  - **OpenRouter**: API key from OpenRouter
  - **Together AI**: API key from Together AI
  - **Perplexity**: API key from Perplexity
  - **Groq**: API key from Groq
  - **Mistral**: API key from Mistral
  - **Cohere**: API key from Cohere

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/smartmark.git
   cd smartmark
   ```

2. Load the extension:
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → Select project directory

3. Configure AI provider:
   - Click SmartMark icon → Settings
   - Select from 10 available providers
   - Enter API key or local server details
   - Save configuration

## Usage

### Bookmark Classification

1. Navigate to the webpage you want to bookmark
2. Click the SmartMark extension icon
3. Click "Classify Bookmark"
4. Review the 5 suggested folder paths
5. Select your preferred path and save

The system automatically extracts:
- Page title and description
- URL structure and domain
- Main content (with noise filtering)
- Existing folder context for consistency

### AI Provider Configuration

Each of the 10 providers has specific configuration requirements:

**Gemini**: Requires API key from Google AI Studio  
**LM Studio**: Requires local server (default: localhost:1234)  
**OpenAI**: Requires OpenAI API key  
**Anthropic**: Requires Anthropic API key  
**OpenRouter**: Requires OpenRouter API key  
**Together AI**: Requires Together AI API key  
**Perplexity**: Requires Perplexity API key  
**Groq**: Requires Groq API key  
**Mistral**: Requires Mistral API key  
**Cohere**: Requires Cohere API key  

## Development

### Commands

```bash
# Validate extension
npm run validate

# Package for distribution
npm run package
```

### Key Features of Simplified Architecture

- **No Testing Infrastructure**: Testing completely removed per user preference
- **Consolidated Logic**: All functionality moved to `lib/` directory
- **Direct Chrome API Usage**: No abstraction layers
- **Simple Configuration**: Basic storage without complex management
- **10 AI Providers**: Comprehensive provider support in single file
- **Fixed Issues**: LM Studio connectivity, word concatenation, folder depth

### Provider Implementation

All 10 AI providers are implemented as simple objects in `lib/ai.js`:

```javascript
// Example provider structure
const providers = {
  gemini: {
    async makeRequest(prompt, config) { /* implementation */ },
    parseResponse(data) { /* implementation */ }
  },
  // ... 9 other providers
};
```

### Configuration Management

Simple configuration in `lib/storage.js`:
- Basic config storage using Chrome APIs
- Secure API key encryption with btoa/atob
- Provider-specific settings sections
- No complex validation or migration

## Security

### Data Privacy
- Local API key storage using Chrome's secure storage
- No external data transmission beyond configured AI providers
- Bookmark data processed locally with user consent
- Encrypted storage using browser's built-in encryption

### Permissions
- `activeTab`: Access current webpage for metadata extraction
- `bookmarks`: Create and organize bookmark folders
- `storage`: Store configuration and API keys
- `scripting`: Execute content scripts for metadata extraction

## Performance

### Optimizations
- **Simplified Codebase**: Reduced from 45+ files to 10 core files
- **Direct API Calls**: No abstraction overhead
- **Inline Processing**: Metadata extraction in service worker
- **Minimal Dependencies**: No external libraries beyond Chrome APIs

### Provider Support
- **10 AI Providers**: Maximum flexibility for users
- **Local Options**: LM Studio for offline processing
- **Cloud Options**: 9 cloud-based providers for various needs
- **Automatic Failover**: Graceful error handling across providers

## Contributing

### Development Guidelines
- Maintain the simplified 10-file structure
- Add provider support in `lib/ai.js`
- Update configuration in `lib/storage.js`
- No complex abstraction layers
- Direct Chrome API usage preferred

### File Organization
- **Extension Logic**: Keep in root directory files
- **Library Functions**: Implement in `lib/` directory
- **Build Scripts**: Use `scripts/` directory
- **Configuration**: Centralize in `lib/storage.js`

## License

MIT License - see `LICENSE` file for details.

## Acknowledgments

- Google Gemini, OpenAI, Anthropic, and other AI providers
- Chrome Extensions API for bookmark management
- Open source community for development patterns