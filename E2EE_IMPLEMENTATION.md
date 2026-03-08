# End-to-End Encryption (E2EE) Implementation

**Status**: ✅ Implemented and integrated
**Date**: 2026-03-08
**Lead**: Jarvis
**Repository**: scholarkit/apexscholar

---

## Overview

ApexScholar now supports transparent **client-side encryption** for all stored research data. When enabled, all data saved to Puter.js cloud storage is encrypted in the browser before transmission. Not even Puter.js or the application server can read the plaintext.

### Key Features

- **AES-GCM-256** encryption for strong security
- **PBKDF2** key derivation (100,000 iterations) with random 16-byte salt
- **Transparent operation**: Existing code using `puterService.kvGet/kvSet` automatically encrypts/decrypts
- **Vault lock/unlock**: Passphrase required on each session after page reload
- **Passphrase change** support
- **Migration tool**: Encrypts existing data after enabling E2EE

---

## How It Works

### Encryption Flow

1. User sets a passphrase (≥ 8 characters) in Settings → Enable Encryption
2. A random salt is generated and stored (unencrypted) in localStorage
3. A 256-bit AES key is derived from the passphrase + salt using PBKDF2
4. Each data item is encrypted with a random IV (12 bytes) using AES-GCM
5. Encrypted payload stored as JSON: `{version, iv, salt, ciphertext}` (base64 strings)
6. On read, payload is decrypted using the derived key

### Unlock Flow

- When E2EE is enabled, the app shows a **Vault Locked** screen on load
- User enters passphrase → key is re-derived from stored salt
- If correct, key is kept in memory for the session
- All subsequent KV reads automatically decrypt; writes encrypt

### Files vs KV

- **KV storage** (projects, entries, resources, insights, kanban, etc.) → **encrypted**
- **File storage** (uploaded PDFs, images) → **NOT encrypted** (binary, large files). Consider encrypting these separately if needed.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/e2ee.ts` | New module: encryption utilities (Web Crypto API) |
| `src/lib/puter.ts` | Integrated E2EE into KV operations; added init, enable, unlock, migrate functions |
| `src/App.tsx` | Added E2EE initialization, lock screen UI when vault locked |
| `src/pages/Settings.tsx` | Added E2EE management UI (enable, unlock, change passphrase, disable) |
| `vite.config.ts` | Removed `SERPAPI_API_KEY` exposure to client bundle (security fix) |
| `.env` (workspace) | Added placeholder keys: `SERPAPI_API_KEY`, `NCBI_API_KEY` |
| `apexscholar/.env.example` | Updated with all required environment variables |

---

## Usage Guide

### Enabling E2EE

1. Open the app and go to **Settings**
2. Under "End-to-End Encryption", enter a strong passphrase (≥ 8 chars)
3. Click **Enable Encryption**
4. The app will encrypt all existing data (may take a moment depending on data size)
5. Upon successful enable, you'll see "Encryption Active" status

### After Enabling

- The vault will be locked on next page reload. You'll see the **Vault Locked** screen.
- Enter your passphrase to unlock.
- For convenience, the app stays unlocked during the same browser session.

### Changing Passphrase

1. In Settings → E2EE section, click **Change Passphrase**
2. Enter current passphrase and new passphrase
3. The key is re-derived and data re-encrypted automatically

### Disabling E2EE

⚠️ **Warning**: Disabling does NOT automatically decrypt stored data. Your data will remain unreadable. Options:

1. **Recommended**: Export an unencrypted backup from Settings → Export Backup
2. Then disable encryption (via Settings)
3. If you need to re-enable later, you must have the original passphrase

### Recovering from Forgotten Passphrase

- **No recovery** – E2EE is zero-knowledge. If you forget your passphrase, you **will lose access** to encrypted data.
- You may need to: Reset the app (clear data), then restore from an **unencrypted** backup (if available).

---

## Environment Variables

Ensure `.env` in project root contains:

```env
# GitHub PAT for LaTeX compilation
GITHUB_TOKEN=ghp_your_pat_here
GITHUB_OWNER=scholarkit
GITHUB_REPO=LaTex

# External API keys
SERPAPI_API_KEY=your_serpapi_key
NCBI_API_KEY=your_ncbi_key
```

---

## Security Notes

- **Encryption keys never leave the browser**. localStorage stores only the salt (public).
- **No server-side decryption** possible – the app is truly zero-knowledge.
- **In-memory key**: Passphrase-derived key is kept in memory only; cleared on page unload.
- **Random IV per encryption** prevents pattern attacks.
- **Authenticated encryption** (AES-GCM) ensures data integrity.

### Limitations

- File uploads are not encrypted (consider client-side encryption before upload if needed).
- Backup/restore via JSON: if you export while E2EE is enabled, the backup file will contain **encrypted** data. Restoring requires E2EE to be enabled and unlocked with the same passphrase.
- Forgetting passphrase → permanent data loss (by design).

---

## Testing

1. Enable E2EE in Settings
2. Create a journal entry or resource
3. Open DevTools → Application → Local Storage → verify that stored values are JSON with `version`, `iv`, `salt`, `ciphertext`
4. Refresh page → Vault lock screen appears
5. Enter passphrase → data decrypts and loads

### Verify Encryption

```javascript
// In browser console after data is stored:
localStorage.getItem('your_kv_key')
// Should output a JSON string with fields: {version: 1, iv: "...", salt: "...", ciphertext: "..."}
```

---

## Migration Path

If migrating from a previous non-E2EE version:

- All existing data is automatically encrypted when enabling E2EE via Settings.
- No manual steps required; the `migrateDataToE2EE()` function handles it.
- After migration, the plaintext data in Puter storage is replaced with ciphertext.

---

## Future Enhancements

- Encrypt file uploads as well (client-side before sending to Puter.js)
- Hardware security key support (WebAuthn)
- Key escrow / recovery options (shielded sharing for teams)
- Integrity verification (HMAC of entire dataset)
- Audit log of encryption events

---

**Important**: Back up your passphrase securely. There is no recovery mechanism.
