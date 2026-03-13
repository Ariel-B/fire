# ADR-016: Security Headers Middleware

**Status**: Accepted

**Date**: 2025-11-18

**Deciders**: Development Team

**Technical Story**: Reverse-engineered from the production request pipeline in `src/Program.cs`

## Context

The application serves a browser-based financial planning interface and accepts user input that drives dynamic UI rendering and API calls. Even without authentication, the site still needs a baseline browser security posture that reduces common client-side attack surface, especially:
- Clickjacking
- MIME sniffing
- Referrer leakage
- Overly permissive script and asset loading
- Accidental weakening of protections during local development

The project also includes test and demo pages under static routes that do not always comply with the main application content security policy, so the security approach needs a controlled exception mechanism rather than a blanket policy removal.

## Decision

Add **security headers middleware** in the ASP.NET Core pipeline and make it part of the standard application configuration.

### Applied headers

1. **`X-Frame-Options: SAMEORIGIN`**
   - Prevent framing by other origins

2. **`X-Content-Type-Options: nosniff`**
   - Disable MIME type sniffing

3. **`X-XSS-Protection: 1; mode=block`**
   - Preserve legacy browser XSS filtering behavior where supported

4. **`Referrer-Policy: strict-origin-when-cross-origin`**
   - Limit referrer leakage to cross-origin destinations

5. **Content-Security-Policy**
   - Applied to normal app pages
   - Skipped for designated test/demo pages that require looser behavior
   - Development policy limits scripts, styles, images, fonts, connections, forms, and framing to tightly scoped sources

## Consequences

### Positive
- Establishes a consistent minimum browser-side security baseline in one place
- Makes the default application behavior safer against common web delivery attacks
- Keeps policy decisions explicit in the request pipeline instead of scattered across hosting infrastructure assumptions
- Preserves a practical escape hatch for internal test pages without weakening the main app routes

### Negative
- CSP changes may be required when new frontend capabilities or third-party integrations are added
- Test/demo routes require deliberate maintenance when new pages are introduced
- Legacy headers such as `X-XSS-Protection` provide limited value on modern browsers but still add policy surface to maintain

### Neutral
- The application relies on application-level middleware rather than only reverse-proxy or CDN header injection
- Security posture is environment-aware, with stricter CSP behavior currently applied only to the main app pages outside the excluded test routes

## Alternatives Considered

### Alternative 1: No Application-Level Security Headers
**Description**: Rely on default browser behavior and host configuration only.

**Pros**:
- Less application code
- No need to maintain policy strings in the app

**Cons**:
- Inconsistent deployments across environments
- Higher risk of missing critical headers
- Security posture becomes implicit instead of reviewable in code

**Why not chosen**: The project needs a reproducible baseline that travels with the application.

### Alternative 2: Proxy-Only Header Management
**Description**: Inject all security headers at Nginx, CDN, or ingress level.

**Pros**:
- Centralized ops-level control
- Keeps application code smaller

**Cons**:
- Harder for developers to discover during code review
- Local development may diverge from production
- Test-route exceptions become harder to express alongside app behavior

**Why not chosen**: The current project benefits from having the policy versioned next to the routes and test-page exceptions it governs.

### Alternative 3: Strict CSP Everywhere With No Exceptions
**Description**: Apply one CSP to every route, including internal test pages.

**Pros**:
- Maximum consistency
- Simpler conceptual model

**Cons**:
- Breaks test/demo assets that intentionally differ from the main app shell
- Raises maintenance friction for internal tooling pages

**Why not chosen**: The repository already contains internal test pages that need explicit accommodation.

## Implementation Notes

- Headers are applied in middleware after CORS and forwarded-header processing
- CSP is skipped for `/tests/`, `/currency-conversion-tests.html`, and `/test-d3.html`
- The current policy keeps `script-src`, `style-src`, `connect-src`, `frame-ancestors`, and related directives tightly scoped for normal app routes

## References

- `src/Program.cs`
- `docs/security/SECURITY.md`
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
