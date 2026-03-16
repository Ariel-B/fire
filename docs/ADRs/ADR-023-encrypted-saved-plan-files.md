# ADR-023: Encrypt Saved Plan Files with Web Crypto AES-256-GCM

**Status**: Accepted

**Date**: 2026-03-16

**Deciders**: Development Team

**Technical Story**: Protect locally saved FIRE plan files that contain highly sensitive portfolio, income, tax, and RSU data.

## Context

Saved FIRE plan files are downloaded to the user's filesystem and can contain a full financial snapshot:
- Portfolio holdings, quantities, cost basis, and asset symbols
- Monthly contributions, expenses, pension assumptions, and tax rates
- RSU grant schedules, vesting dates, employer stock symbols, and share counts
- Birth date and retirement timeline information

The existing save flow wrote plaintext JSON directly to disk. Anyone with access to the file could read it in a text editor, and accidental file sharing or cloud sync exposed the same data without any protection. Because this application is local-first and does not persist plans on a server, the protection must happen entirely in the browser.

## Decision

Encrypt saved plan files client-side using the browser's built-in **Web Crypto API** with **AES-256-GCM** and **PBKDF2-SHA-256**.

### Encrypted file envelope

Saved `.json` plan files use a structured JSON envelope:

```json
{
  "encrypted": true,
  "version": "1.0",
  "algorithm": "AES-256-GCM",
  "kdf": "PBKDF2",
  "kdfIterations": 600000,
  "salt": "<base64>",
  "iv": "<base64>",
  "data": "<base64 ciphertext>"
}
```

### Key derivation and encryption rules

1. Prompt for a password on every **Save** and **Save As**
2. Prompt for a password when loading an encrypted plan
3. Derive a non-extractable AES key from the password with:
   - PBKDF2
   - SHA-256
   - 600,000 iterations
   - 16-byte random salt per file
4. Encrypt the plaintext plan JSON with:
   - AES-GCM
   - 256-bit key
   - 12-byte random IV per file
5. Treat AES-GCM authentication failures as wrong-password or tamper detection
6. Keep legacy plaintext plan files loadable for backward compatibility

## Consequences

### Positive

- Protects sensitive saved plan files at rest on the local filesystem
- Adds integrity checking automatically via AES-GCM authentication
- Requires no new runtime dependencies because Web Crypto is built in
- Preserves the app's local-first architecture and offline save/load behavior
- Keeps legacy plaintext plans readable so existing users are not locked out

### Negative

- Save and load operations become slightly slower because PBKDF2 is intentionally expensive
- Users must re-enter a password for every encrypted save and load operation
- Lost passwords cannot be recovered because the app never stores them

### Neutral

- The file remains JSON, but now contains an encrypted envelope instead of plaintext plan data
- Excel export remains unchanged and is outside the scope of this decision

## Alternatives Considered

### Alternative 1: Keep Plaintext JSON

**Pros**:
- Simplest implementation
- No password prompt friction

**Cons**:
- Offers no protection for highly sensitive financial data at rest
- No tamper detection

**Why not chosen**: The privacy risk is too high for the sensitivity of the saved data.

### Alternative 2: Add a Third-Party JavaScript Crypto Library

**Pros**:
- Could offer higher-level helper APIs

**Cons**:
- Adds dependency and supply-chain surface area
- Duplicates capabilities available in modern browsers already

**Why not chosen**: Web Crypto provides the required primitives natively without adding dependencies.

### Alternative 3: Optional Encryption Toggle

**Pros**:
- Gives users a plaintext fallback

**Cons**:
- Makes insecure saves easy to choose by mistake
- Complicates the UX and support expectations

**Why not chosen**: Always encrypting new saves reduces accidental exposure and keeps the workflow unambiguous.

## Implementation Notes

- `wwwroot/ts/crypto/plan-crypto.ts` owns the encrypted envelope format and AES-GCM/PBKDF2 operations
- `wwwroot/ts/components/password-dialog.ts` owns the password prompt UI for save/load flows
- `wwwroot/ts/persistence/plan-persistence.ts` integrates encryption on save and conditional decryption on load
- New encrypted saves use the `.enc.json` filename convention while the load picker still accepts `.json`

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [MDN Web Crypto API](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API)
- [NIST SP 800-38D: Galois/Counter Mode (GCM)](https://csrc.nist.gov/pubs/sp/800/38/d/final)
