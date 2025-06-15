# Security Policy

## Supported Versions

We currently support the following versions of SmartMark with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The SmartMark team takes security seriously. If you discover a security vulnerability, please help us maintain the security of our users by reporting it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities to us via one of the following methods:

1. **Email**: Send details to [security-email@example.com] (replace with actual email)
2. **GitHub Security Advisory**: Use GitHub's private vulnerability reporting feature
3. **Private Message**: Contact the maintainers directly

### What to Include

When reporting a vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: What could an attacker accomplish?
- **Reproduction Steps**: Detailed steps to reproduce the issue
- **Affected Versions**: Which versions of SmartMark are affected
- **Environment**: Browser version, OS, extension version
- **Proposed Fix**: If you have suggestions for fixing the issue

### Response Timeline

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Initial Response**: We will provide an initial response within 7 days
- **Updates**: We will provide regular updates on our progress
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

### Security Measures in SmartMark

SmartMark implements several security measures:

- **Input Validation**: All user inputs are validated and sanitized
- **Content Security Policy**: Strict CSP prevents code injection
- **Secure Storage**: API keys stored using Chrome's secure storage
- **Permission Minimization**: Only requests necessary permissions
- **No External Dependencies**: Minimal attack surface
- **Regular Security Audits**: Code reviewed for security issues

### Common Security Considerations

When using SmartMark:

- **API Keys**: Keep your API keys secure and don't share them
- **Permissions**: Review and understand the permissions requested
- **Updates**: Keep the extension updated to the latest version
- **Source**: Only install from trusted sources (Chrome Web Store)

### Responsible Disclosure

We follow responsible disclosure practices:

- We will work with security researchers to verify and fix issues
- We will provide credit to researchers who report valid vulnerabilities
- We will coordinate public disclosure timing with researchers
- We will release security updates as quickly as possible

### Bug Bounty

Currently, we do not offer a formal bug bounty program, but we greatly appreciate security research and will acknowledge contributions in our release notes.

## Security Best Practices for Contributors

If you're contributing to SmartMark:

- **Code Review**: All code changes require review
- **Security Testing**: Test for common web security issues
- **Dependencies**: Minimize and audit all dependencies
- **Secrets**: Never commit API keys or sensitive data
- **Validation**: Always validate and sanitize inputs
- **Permissions**: Request minimal necessary permissions

## Contact

For security-related questions or concerns, please contact the maintainers through the private channels mentioned above.

Thank you for helping keep SmartMark secure!
