# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not** open a public GitHub issue.

Instead, please report it privately via one of the following methods:

- **GitHub Private Security Advisory**: Use the [Report a vulnerability](https://github.com/Ariel-B/fire/security/advisories/new) button on the Security tab of this repository.
- **Email**: Send a description of the vulnerability to the maintainer via the contact information on the [GitHub profile](https://github.com/Ariel-B).

### What to include in your report

Please include as much of the following as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- The affected version(s)
- Any suggested mitigations or fixes

### What to expect

- **Acknowledgement**: You will receive an acknowledgement within 48 hours.
- **Assessment**: The vulnerability will be assessed and you will be updated within 7 days.
- **Resolution**: Critical vulnerabilities will be patched as quickly as possible. You will be notified when a fix is available.
- **Credit**: With your permission, you will be credited in the release notes.

## Security Best Practices for Deployment

- **API Keys**: Never commit API keys. Use ASP.NET Core User Secrets in development and environment variables in production.
- **CORS**: Configure `AllowedOrigins` in `appsettings.json` to restrict requests to your own domain.
- **HTTPS**: Always run behind HTTPS in production (the Dockerfile and deployment guides assume a reverse proxy handles TLS).
- **Rate Limiting**: The application ships with built-in rate limiting (100 req/min by default). Tune via `appsettings.json` for your expected traffic.

## Scope

This security policy covers the source code in this repository. It does not cover:

- Third-party dependencies (report those to the respective upstream projects)
- Finnhub API or exchangerate.host (external services consumed by this app)
- Infrastructure or hosting environments where this app is deployed