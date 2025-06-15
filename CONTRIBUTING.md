# Contributing to SmartMark

Thank you for your interest in contributing to SmartMark! We welcome contributions from the community and are pleased to have you aboard.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and what behavior you expected to see**
* **Include screenshots if applicable**
* **Include your Chrome version and operating system**

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the enhancement**
* **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repository
2. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our coding standards
4. Add or update tests as appropriate
5. Ensure all tests pass:
   ```bash
   npm test
   ```
6. Update documentation if needed
7. Commit your changes with a clear message:
   ```bash
   git commit -m "Add feature: your feature description"
   ```
8. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
9. Create a Pull Request

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/smartmark.git
   cd smartmark
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project folder

## Coding Standards

### JavaScript Style

* Use ES6+ features where appropriate
* Use meaningful variable and function names
* Add JSDoc comments for functions
* Follow existing code style and patterns
* Use semicolons consistently
* Use single quotes for strings

### File Organization

* Keep files focused on a single responsibility
* Use the existing `utils/` structure for reusable code
* Add new utilities to appropriate files or create new ones as needed

### Chrome Extension Best Practices

* Follow Manifest V3 guidelines
* Use proper permission requests
* Implement proper error handling
* Validate all user inputs
* Use secure storage for sensitive data

### Testing

* Write tests for new functionality
* Ensure existing tests continue to pass
* Aim for good test coverage
* Test both success and error scenarios

### Security

* Validate and sanitize all inputs
* Use Content Security Policy properly
* Store API keys securely
* Follow secure coding practices
* Report security issues privately

## Commit Message Guidelines

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### Commit Message Format

```
type(scope): subject

body

footer
```

Types:
* `feat`: A new feature
* `fix`: A bug fix
* `docs`: Documentation only changes
* `style`: Changes that do not affect the meaning of the code
* `refactor`: A code change that neither fixes a bug nor adds a feature
* `test`: Adding missing tests or correcting existing tests
* `chore`: Changes to the build process or auxiliary tools

## Testing Guidelines

### Unit Tests

* Test individual functions and modules
* Mock external dependencies
* Test both success and failure cases
* Use descriptive test names

### Integration Tests

* Test component interactions
* Test Chrome API integrations
* Test end-to-end workflows

### Manual Testing

* Test in different Chrome versions
* Test with different AI providers
* Test edge cases and error conditions
* Test accessibility features

## Documentation

* Update README.md for user-facing changes
* Update JSDoc comments for code changes
* Update CLAUDE.md for development context
* Include examples where helpful

## Getting Help

* Check existing issues and documentation first
* Create an issue for questions or problems
* Join discussions in existing issues
* Be respectful and constructive in all interactions

Thank you for contributing to SmartMark!
