/**
 * End-to-End Encryption (E2EE) Service for ApexScholar
 *
 * This module provides transparent encryption/decryption of all stored data.
 * Uses Web Crypto API with AES-GCM-256 and PBKDF2 for key derivation.
 *
 * Architecture:
 * - User provides a passphrase ( Settings )
 * - Key derived from passphrase + salt using PBKDF2 (100k iterations)
 * - Each data item encrypted with unique IV (12 bytes for AES-GCM)
 * - Salt stored alongside encrypted data (not secret)
 * - All KV storage operations automatically encrypt/decrypt
 */

import { kv } from './kv';

// Type for encrypted payload stored in KV
export interface EncryptedPayload {
  version: number; // encryption format version
  iv: string; // base64-encoded initialization vector
  salt: string; // base64-encoded salt used for key derivation
  ciphertext: string; // base64-encoded encrypted data
}

export interface E2EEConfig {
  enabled: boolean;
  isInitialized: boolean;
  // Salt for key derivation - stored unencrypted in local storage
  salt: string | null;
}

const E2EE_VERSION = 1;
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes for AES-GCM recommended

const STORAGE_KEY = 'apexscholar_e2ee_config';
const PASSPHRASE_PROMPT_KEY = 'apexscholar_passphrase_prompt';

class E2EEService {
  private cryptoKey: CryptoKey | null = null;
  private config: E2EEConfig = {
    enabled: false,
    isInitialized: false,
    salt: null,
  };

  /**
   * Initialize E2EE system
   * - Load config from localStorage
   - If enabled, prompt user for passphrase (callback to UI)
   */
  async initialize(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
      }

      if (this.config.enabled && this.config.salt) {
        // E2EE is enabled but we don't have the key yet
        // UI should call promptForPassphrase() to get it
        return true;
      }

      return true;
    } catch (error) {
      console.error('E2EE initialize failed:', error);
      return false;
    }
  }

  /**
   * Check if E2EE is enabled and ready
   */
  isEnabled(): boolean {
    return this.config.enabled && this.cryptoKey !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): E2EEConfig {
    return { ...this.config };
  }

  /**
   * Generate a random salt
   */
  private generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Derive a CryptoKey from passphrase and salt
   */
  private async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Enable E2EE with a user passphrase
   * Generates new salt and derives key
   */
  async enable(passphrase: string): Promise<boolean> {
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters');
    }

    try {
      const salt = this.generateSalt();
      this.cryptoKey = await this.deriveKey(passphrase, salt);

      this.config = {
        enabled: true,
        isInitialized: true,
        salt: this.arrayBufferToBase64(salt.buffer),
      };

      this.saveConfig();
      return true;
    } catch (error) {
      console.error('E2EE enable failed:', error);
      return false;
    }
  }

  /**
   * Prompt user for passphrase and derive key
   * Call this when isEnabled() is true but cryptoKey is null
   */
  async promptForPassphrase(passphrase: string): Promise<boolean> {
    if (!this.config.salt) {
      console.error('E2EE salt missing - cannot unlock');
      return false;
    }

    try {
      const salt = new Uint8Array(this.base64ToArrayBuffer(this.config.salt));
      this.cryptoKey = await this.deriveKey(passphrase, salt);
      return true;
    } catch (error) {
      console.error('E2EE unlock failed:', error);
      return false;
    }
  }

  /**
   * Disable E2EE (decrypt all data first if needed - handled by caller)
   */
  disable(): void {
    this.cryptoKey = null;
    this.config = {
      enabled: false,
      isInitialized: false,
      salt: null,
    };
    this.saveConfig();
  }

  /**
   * Encrypt arbitrary data
   */
  async encrypt(data: any): Promise<EncryptedPayload> {
    if (!this.cryptoKey) {
      throw new Error('E2EE not initialized - user must unlock with passphrase');
    }

    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const enc = new TextEncoder();
    const plaintext = enc.encode(JSON.stringify(data));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.cryptoKey,
      plaintext
    );

    return {
      version: E2EE_VERSION,
      iv: this.arrayBufferToBase64(iv.buffer),
      salt: this.config.salt!, // already stored in config
      ciphertext: this.arrayBufferToBase64(ciphertext),
    };
  }

  /**
   * Decrypt payload back to original data
   */
  async decrypt(encrypted: EncryptedPayload): Promise<any> {
    if (!this.cryptoKey) {
      throw new Error('E2EE not initialized - user must unlock with passphrase');
    }

    const iv = new Uint8Array(this.base64ToArrayBuffer(encrypted.iv));
    const ciphertext = new Uint8Array(this.base64ToArrayBuffer(encrypted.ciphertext));

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.cryptoKey,
      ciphertext
    );

    const dec = new TextDecoder();
    const json = dec.decode(plaintext);
    return JSON.parse(json);
  }

  /**
   * Serialize an EncryptedPayload to a string for storage
   */
  serialize(encrypted: EncryptedPayload): string {
    return JSON.stringify(encrypted);
  }

  /**
   * Parse and validate encrypted payload from storage
   */
  parse(stored: string): EncryptedPayload {
    const payload = JSON.parse(stored);
    if (!payload.version || !payload.iv || !payload.ciphertext) {
      throw new Error('Invalid encrypted payload format');
    }
    return payload as EncryptedPayload;
  }

  /**
   * Check if a stored value looks like an encrypted payload
   */
  isEncryptedFormat(value: any): boolean {
    if (typeof value !== 'string') return false;
    try {
      const parsed = JSON.parse(value);
      return !!parsed.version && !!parsed.iv && !!parsed.ciphertext;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Save config to localStorage
   */
  private saveConfig(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
  }

  /**
   * Clear all E2EE data from storage (for disable/reset)
   */
  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PASSPHRASE_PROMPT_KEY);
  }

  /**
   * Change passphrase (re-encrypt data with new key)
   * Caller must re-encrypt all stored data after this
   */
  async changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<boolean> {
    // First, unlock with old passphrase
    if (!(await this.promptForPassphrase(oldPassphrase))) {
      return false;
    }

    // Generate new salt and derive new key
    const newSalt = this.generateSalt();
    const newKey = await this.deriveKey(newPassphrase, newSalt);

    // Update config with new salt
    this.cryptoKey = newKey;
    this.config.salt = this.arrayBufferToBase64(newSalt.buffer);
    this.saveConfig();

    return true;
  }
}

// Export singleton
export const e2eeService = new E2EEService();

/**
 * Initialize E2EE system (call on app startup)
 */
export async function initE2EE(): Promise<boolean> {
  return await e2eeService.initialize();
}

/**
 * Enable E2EE with user passphrase
 */
export async function enableE2EE(passphrase: string): Promise<boolean> {
  return await e2eeService.enable(passphrase);
}

/**
 * Unlock E2EE with passphrase (required after page reload when enabled)
 */
export async function unlockE2EE(passphrase: string): Promise<boolean> {
  return await e2eeService.promptForPassphrase(passphrase);
}

/**
 * Disable E2EE (use with caution - data remains encrypted unless re-encrypted)
 */
export function disableE2EE(): void {
  e2eeService.disable();
}

/**
 * Check if E2EE is active and ready
 */
export function isE2EEEnabled(): boolean {
  return e2eeService.isEnabled();
}

/**
 * Get E2EE configuration status
 */
export function getE2EEConfig() {
  return e2eeService.getConfig();
}

/**
 * Change E2EE passphrase (caller must re-encrypt all stored data after)
 */
export async function changeE2EEPassphrase(
  oldPassphrase: string,
  newPassphrase: string
): Promise<boolean> {
  return await e2eeService.changePassphrase(oldPassphrase, newPassphrase);
}

/**
 * Re-encrypt all existing KV data with current E2EE key.
 * Call after enabling E2EE to secure previously unencrypted data.
 * Returns counts of success/failure.
 */
export async function migrateDataToE2EE(): Promise<{
  success: number;
  failed: number;
  skipped: number;
}> {
  if (!isE2EEEnabled()) {
    throw new Error('E2EE must be enabled before migrating data');
  }

  // List of all known KV keys used by the application
  const KNOWN_KEYS = [
    'research_projects',
    'research_entries',
    'research_resources',
    'research_insights',
    'research_knowledgebase',
    'research_kanban',
    // Add more keys as discovered
  ];

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const key of KNOWN_KEYS) {
    try {
      // Read raw value directly from Puter (bypassing decryption layer).
      // Since kv.ts now auto-decrypts if E2EE is enabled,
      // we must retrieve raw from the window.puter object directly to avoid double processing,
      // OR we just use kvGet if it handles plain values gracefully. But to be safe:
      const rawValue = await window.puter.kv.get(key);
      if (rawValue === null) {
        skipped++;
        continue;
      }

      // Check if already encrypted
      try {
        const parsed = JSON.parse(rawValue);
        // Check if parsed object has encryption fields
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.version &&
          parsed.iv &&
          parsed.ciphertext
        ) {
          // Already encrypted, skip
          skipped++;
          continue;
        }
        // Plain JSON - will be re-encrypted via kv.set
        const value = parsed;
        await kv.set(key, value);
        success++;
      } catch {
        // Non-JSON value (unlikely), skip
        skipped++;
      }
    } catch (err) {
      console.error(`Failed to migrate key ${key}:`, err);
      failed++;
    }
  }

  return { success, failed, skipped };
}

/**
 * List all KV keys in storage (for debugging/migration)
 */
export async function listAllKeys(): Promise<string[]> {
  // Puter.js doesn't expose key listing directly in the SDK we have
  // So we return known keys only for now
  return [
    'research_projects',
    'research_entries',
    'research_resources',
    'research_insights',
    'research_knowledgebase',
    'research_kanban',
  ];
}
