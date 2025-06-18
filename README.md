# SmartMark

An intelligent Chrome extension that automatically organizes bookmarks into meaningful folder hierarchies using AI classification. SmartMark leverages Google's Gemini AI to analyze web page content and suggest optimal folder structures, eliminating the manual overhead of bookmark management for power users, knowledge workers, and content curators.

## Status

**Version**: 1.0.0  
**Development Status**: Active Development  
**Chrome Extension**: Manifest V3 Compatible  
**Testing**: Jest + Playwright configured  
**Security**: Comprehensive validation and sanitization implemented  

## Features

- **AI-Powered Classification**: Uses Google Gemini 1.5 Flash for intelligent content analysis
- **Smart Folder Suggestions**: Generates up to 3-level deep folder hierarchies
- **Multiple AI Provider Support**: Compatible with Gemini API, LM Studio, and Ollama
- **Intelligent Metadata Extraction**: Analyzes page titles, descriptions, headings, and URL structure
- **Dynamic Folder Creation**: Automatically creates folder structures as needed
- **Fallback Safety**: Creates "Uncategorized" folders when AI classification fails
- **Secure Configuration**: Local storage of API keys with validation
- **Comprehensive Error Handling**: Robust error management with user-friendly messages

## Installation

### Prerequisites

- Google Chrome browser
- Google Gemini API key (or compatible AI service)

### Steps

1. Clone this repository:

```bash
git clone https://github.com/yourusername/smartmark.git
```

1. Open Chrome and navigate to `chrome://extensions/`

1. Enable "Developer mode" in the top right corner

1. Click "Load unpacked" and select the cloned repository folder

1. Configure your AI service:
   - Click the extension icon
   - Go to Settings (gear icon)
   - Enter your Gemini API key or configure LM Studio/Ollama settings

## Usage

### Basic Classification

1. Navigate to any webpage you want to bookmark
2. Click the SmartMark extension icon in your Chrome toolbar
3. Click "Classify Bookmark" to analyze the page content
4. Review the suggested folder structure
5. Select your preferred folder and click "Save Bookmark"

### Settings Configuration

- **API Provider**: Choose between Gemini API, LM Studio, or Ollama
- **API Settings**: Configure API keys, endpoints, and model parameters
- **Classification Preferences**: Adjust how folders are suggested and created

The extension will automatically:

- Extract page metadata (title, description, headings)
- Analyze content using AI
- Suggest appropriate folder hierarchies (up to 3 levels deep)
- Create folders if they don't exist
- Save bookmarks with intelligent organization

## Development

### Development Prerequisites

- Google Chrome browser
- Node.js (for testing and development dependencies)
- Git
- Basic understanding of Chrome Extension development

### Project Structure

```text
smartmark/
├── manifest.json                 # Extension configuration (Manifest V3)
├── background.js                # Service worker for AI classification
├── content.js                  # Content script for metadata extraction
├── popup.html & popup.js       # Extension popup interface
├── settings.html & settings.js # Configuration interface
├── package.json               # Development dependencies and scripts
├── docs/                     # Documentation
│   ├── architecture.md      # System architecture overview
│   ├── code-style-guide.md # Coding standards and conventions
│   └── api-reference.md   # Comprehensive API documentation
├── icons/                 # Extension icons (16px to 128px)
└── utils/                # Utility modules
    ├── api.js           # AI API integration orchestration
    ├── bookmark.js      # Chrome bookmarks API wrapper
    ├── storage.js       # Chrome storage utilities
    ├── validation.js    # Input validation and security
    ├── error.js        # Global error handling
    ├── ui.js           # UI helper functions
    ├── index.js        # Main utils entry point
    ├── business/       # Business logic modules
    │   ├── bookmark-classifier.js  # Classification logic
    │   ├── suggestion-manager.js   # Suggestion state management
    │   ├── bookmark-saver.js      # Bookmark saving logic
    │   └── ui-controller.js       # UI coordination
    ├── providers/      # AI provider implementations
    │   ├── base.js         # Base provider class
    │   ├── gemini.js       # Gemini provider
    │   ├── lmstudio.js     # LM Studio provider
    │   ├── ollama.js       # Ollama provider
    │   ├── factory.js      # Provider factory
    │   └── token-manager.js # Token optimization
    ├── config/         # Configuration management
    │   ├── index.js        # Configuration singleton
    │   └── migration.js    # Settings migration
    └── error/          # Error handling system
        ├── errors.js       # Custom error classes
        ├── logger.js       # Logging service
        └── notifier.js     # User notifications
```

### Key Architecture Components

The extension follows a modular architecture with clear separation of concerns:

#### Extension Layer
- **Service Worker (`background.js`)**: Central message handler and orchestrator
- **Content Script (`content.js`)**: Extracts page metadata for classification
- **Popup Interface (`popup.js`)**: Delegates all logic to UIController
- **Settings Page**: API configuration and preferences

#### Business Logic Layer
- **BookmarkClassifier**: Handles classification requests and responses
- **SuggestionManager**: Manages suggestion state with observer pattern
- **BookmarkSaver**: Handles bookmark saving operations
- **UIController**: Coordinates between business logic and UI

#### Provider Abstraction Layer
- **AIProvider**: Base class defining provider interface
- **Provider Implementations**: Gemini, LM Studio, and Ollama
- **AIProviderFactory**: Creates provider instances
- **TokenManager**: Optimizes context for large bookmark collections

#### Infrastructure Layer
- **Configuration**: Centralized configuration with dot-notation access
- **Error Handling**: Custom error classes, logging, and notifications
- **Utilities**: Reusable functionality for storage, validation, and UI

For detailed architecture information, see [docs/architecture.md](docs/architecture.md).

### AI Integration

The extension supports multiple AI providers:

- **Google Gemini API**: Primary recommendation for best results
- **LM Studio**: Local AI model hosting
- **Ollama**: Local AI model management

### Security Features

- Input validation and sanitization
- API key secure storage
- Content Security Policy enforcement
- Protection against path traversal attacks

## Configuration

### API Keys and Settings

Configure your preferred AI service through the extension settings:

1. Click the SmartMark extension icon
2. Click the settings gear icon
3. Choose your AI provider:
   - **Gemini API**: Enter your Google AI Studio API key
   - **LM Studio**: Configure local server endpoint and model
   - **Ollama**: Set up local Ollama instance and model

### Supported Models

- **Gemini**: `gemini-1.5-flash-latest` (recommended)
- **LM Studio**: Compatible with most local models
- **Ollama**: `gemma3:4b` and other supported models

## Troubleshooting

### Common Issues

- **API Key Invalid**: Ensure your Gemini API key is correctly entered in settings
- **Classification Fails**: Check internet connection and API service status
- **Folder Creation Issues**: Verify Chrome bookmarks permissions are granted
- **Local AI Connection**: Ensure LM Studio/Ollama is running on configured ports

### Error Handling

The extension includes comprehensive error handling:

- Network failures automatically fall back to "Uncategorized" folder
- Invalid API responses trigger user-friendly error messages
- Timeout protection prevents hanging operations

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper testing
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the [Code Style Guide](docs/code-style-guide.md)
- Add tests for new functionality
- Update documentation for user-facing changes
- Ensure security best practices are followed
- Refer to the [API Reference](docs/api-reference.md) for module usage

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Architecture Overview](docs/architecture.md)**: System design, data flow, and design patterns
- **[Code Style Guide](docs/code-style-guide.md)**: Coding standards and conventions
- **[API Reference](docs/api-reference.md)**: Detailed API documentation for all modules

### Quick Links

- [Business Logic APIs](docs/api-reference.md#business-logic-apis)
- [Provider APIs](docs/api-reference.md#api-provider-apis)
- [Configuration System](docs/api-reference.md#configuration-apis)
- [Error Handling](docs/api-reference.md#error-handling-apis)
- [Chrome Extension Message Passing](docs/api-reference.md#chrome-extension-apis)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google Gemini AI for intelligent classification
- Chrome Extensions API for bookmark management
- The open-source community for inspiration and tools
