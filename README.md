# SmartMark

An intelligent Chrome extension that automatically organizes bookmarks into hierarchical folder structures using AI classification. SmartMark employs a provider-agnostic architecture supporting Google Gemini, LM Studio, and Ollama for scalable bookmark management across diverse AI infrastructures.

## Status

**Version**: 1.0.0  
**Architecture**: Refactored modular design with provider abstraction  
**Chrome Extension**: Manifest V3 compatible  
**Testing**: Jest + Playwright configured  
**Security**: Comprehensive input validation and error handling

## Features

- **Multi-Provider AI Integration**: Abstracted provider layer supporting Gemini API, LM Studio, and Ollama.
- **Intelligent Token Management**: Adaptive context optimization for large bookmark collections.
- **Hierarchical Folder Generation**: Creates up to 3-level deep folder structures with confidence scoring.
- **Bookmark Migration System**: Automated reorganization of existing flat bookmark structures.
- **Centralized Configuration**: Environment-aware configuration management with migration utilities.
- **Production Error Handling**: Structured logging, user notifications, and recovery mechanisms.
- **Secure Input Processing**: Comprehensive validation preventing injection and path traversal attacks.

## Architecture

SmartMark implements a layered architecture with clear separation of concerns:

### Extension Layer
- **Service Worker** (`background.js`): Message orchestration and AI classification coordination.
- **Content Script** (`content.js`): Metadata extraction with noise filtering and structured data parsing.
- **Popup Interface** (`popup.js`): Delegates to UIController for business logic coordination.
- **Settings Management**: Provider configuration and API key management.

### Business Logic Layer
```
utils/business/
├── bookmark-classifier.js    # Classification request handling
├── suggestion-manager.js     # State management with observer pattern
├── bookmark-saver.js         # Bookmark persistence operations
├── ui-controller.js          # UI coordination and event handling
└── migration-controller.js   # Bookmark reorganization workflows
```

### Provider Abstraction Layer
```
utils/providers/
├── base.js           # AIProvider interface definition
├── gemini.js         # Google Gemini implementation
├── lmstudio.js       # LM Studio local provider
├── ollama.js         # Ollama local provider
├── factory.js        # Provider instantiation and configuration
└── token-manager.js  # Context optimization and token estimation
```

### Infrastructure Layer
```
utils/config/         # Centralized configuration with dot-notation access
utils/error/          # Structured error classes, logging, and notifications
utils/                # Core utilities (bookmark, storage, validation, UI)
```

## Installation

### Prerequisites

- Google Chrome browser
- AI provider access:
  - **Gemini**: Google AI Studio API key
  - **LM Studio**: Local installation with running model
  - **Ollama**: Local installation with downloaded model

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/smartmark.git
    cd smartmark
    ```
2.  Load the extension:
    - Open Chrome → `chrome://extensions/`
    - Enable "Developer mode"
    - Click "Load unpacked" → Select project directory
3.  Configure AI provider:
    - Click SmartMark icon → Settings
    - Select provider and enter configuration details
    - Test connection with sample classification

### Configuration

#### Provider Setup

**Gemini API:**
```javascript
// Requires API key from Google AI Studio
Provider: Gemini
API Key: AIza....[35 characters]
```

**LM Studio:**
```javascript
// Local inference server
Provider: LM Studio
Host: localhost
Port: 1234
Model: Auto-detected loaded model
```

**Ollama:**
```javascript
// Local model management
Provider: Ollama  
Host: localhost
Port: 11434
Model: gemma3:4b (configurable)
```

#### Configuration Management
The extension uses centralized configuration with environment-specific overrides:

```javascript
// Access configuration values
config.get('api.gemini.maxOutputTokens')
config.get('ui.messageTimeout')
config.get('storage.cache.ttl')

// Provider-specific settings
config.get('api.lmstudio.host')
config.get('api.ollama.model')
```

## Usage

### Bookmark Classification
1.  Navigate to target webpage.
2.  Click SmartMark extension icon.
3.  Select "Classify Bookmark".
4.  Review 5 suggested folder paths with confidence scores.
5.  Select preferred path and save.

The system extracts comprehensive metadata including:

- Page title, description, and headings
- Author and publication date (when available)
- URL structure and domain analysis
- Main content with noise filtering
- Existing folder context for consistency

### Bookmark Migration
Reorganize existing flat bookmark structures:

1.  Click "Organize Existing Bookmarks".
2.  Review proposed moves from generic folders to hierarchical structures.
3.  Select bookmarks for migration.
4.  Execute batch migration with progress tracking.

Migration targets bookmarks in generic folders (AI, Tech, Programming, etc.) and suggests specific hierarchical placements.

## Development

### Project Structure
```
smartmark/
├── manifest.json                 # Extension configuration
├── background.js                 # Service worker orchestration
├── content.js                    # Metadata extraction
├── popup.html & popup.js         # UI interface
├── settings.html & settings.js   # Configuration interface
├── utils/                        # Modular utility layer
│   ├── business/                 # Business logic services
│   ├── providers/                # AI provider implementations
│   ├── config/                   # Configuration management
│   ├── error/                    # Error handling and logging
│   ├── api.js                    # API orchestration
│   ├── bookmark.js               # Chrome bookmarks API wrapper
│   ├── storage.js                # Chrome storage utilities
│   ├── validation.js             # Input sanitization
│   └── ui.js                     # UI helper functions
├── tests/                        # Unit and integration tests
└── scripts/                      # Build and validation scripts
```

### Key Architectural Components

**Provider Abstraction:**
```javascript
// Add new AI provider
class CustomProvider extends AIProvider {
  async makeRequest(prompt) { /* implementation */ }
  parseResponse(data) { /* implementation */ }
}

// Register in factory
AIProviderFactory.registerProvider('custom', CustomProvider);
```

**Error Handling:**
```javascript
// Structured error hierarchy
try {
  await provider.getFolderSuggestions(prompt);
} catch (error) {
  if (error instanceof APIError) {
    // Handle API-specific errors
  } else if (error instanceof NetworkError) {
    // Handle connectivity issues
  }
}
```

**Token Management:**
```javascript
// Adaptive context optimization
const result = TokenManager.optimizeContext(
  existingFolders, 
  basePrompt, 
  maxContextTokens
);
// Automatically prioritizes root folders and shallow hierarchies
```

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E testing
npm run test:e2e

# Validate extension
npm run validate

# Package for distribution
npm run package
```

## Testing

The project implements comprehensive testing:

- **Unit Tests**: Business logic and utility functions.
- **Integration Tests**: Provider interactions and bookmark operations.
- **E2E Tests**: Complete user workflows with Playwright.
- **Manual Test Scripts**: Migration workflow validation.

### Token Optimization

SmartMark implements intelligent token management for large bookmark collections:

- **Adaptive Context**: Automatically reduces folder context when approaching token limits.
- **Priority Ranking**: Favors root folders and shallow hierarchies for classification consistency.
- **Performance Monitoring**: Tracks optimization effectiveness and processing time.
- **Fallback Strategies**: Graceful degradation when context optimization is insufficient.

## Security

### Input Validation
- Path traversal attack prevention
- Injection attack mitigation
- Reserved filename detection
- Character set restrictions

### Error Handling
- Structured error classes with severity levels
- Secure logging without sensitive data exposure
- User notification system with appropriate detail levels
- Recovery mechanisms for transient failures

### Data Privacy
- Local API key storage using Chrome's secure storage.
- No external data transmission beyond configured AI providers.
- Bookmark data processed locally with user consent.

## Contributing

### Development Guidelines
- Follow modular architecture patterns.
- Implement comprehensive error handling.
- Add unit tests for new functionality.
- Update configuration schema for new features.
- Document API changes in JSDoc format.

### Code Organization
- **Business Logic**: Implement in `utils/business/` with clear interfaces.
- **Provider Integration**: Extend `AIProvider` base class in `utils/providers/`.
- **Configuration**: Add to centralized schema in `utils/config/`.
- **Error Handling**: Use structured error classes from `utils/error/`.

### Testing Requirements
- Unit test coverage >80%
- Integration tests for provider interactions
- E2E tests for critical user workflows
- Manual testing documentation for complex features

### API Documentation
Comprehensive API documentation available in `/docs/`:

- **Architecture Overview**: System design and data flow
- **API Reference**: Detailed module documentation
- **Provider Integration**: Adding new AI providers
- **Configuration Guide**: Advanced configuration options

## Performance

### Optimization Features
- **Bookmark folder caching**: 1-hour TTL with intelligent invalidation.
- **Token-aware requests**: Adaptive context sizing prevents API limits.
- **Batch operations**: Efficient migration for large bookmark collections.
- **Error recovery**: Automatic retry with exponential backoff.

### Monitoring
- Structured logging with configurable levels.
- Performance metrics for classification operations.
- Token usage tracking and optimization effectiveness.
- Error rate monitoring with severity classification.

## License

MIT License - see `LICENSE` file for details.

## Acknowledgments

- Google Gemini AI for intelligent classification capabilities
- LM Studio and Ollama for local AI inference options
- Chrome Extensions API for bookmark management integration
- Open source community for architectural patterns and best practices
