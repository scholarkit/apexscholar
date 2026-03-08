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

// Type for encrypted payload stored in KV
export interface EncryptedPayload {
  version: number;      // encryption format version
  iv: string;          // base64-encoded initialization vector
  salt: string;        // base64-encoded salt used for key derivation
  ciphertext: string;  // base64-encoded encrypted data
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
    salt: null
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
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
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
        salt: this.arrayBufferToBase64(salt)
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
      salt: null
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
      iv: this.arrayBufferToBase64(iv),
      salt: this.config.salt!, // already stored in config
      ciphertext: this.arrayBufferToBase64(ciphertext)
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
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
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
    if (!await this.promptForPassphrase(oldPassphrase)) {
      return false;
    }

    // Generate new salt and derive new key
    const newSalt = this.generateSalt();
    const newKey = await this.deriveKey(newPassphrase, newSalt);

    // Update config with new salt
    this.cryptoKey = newKey;
    this.config.salt = this.arrayBufferToBase64(newSalt);
    this.saveConfig();

    return true;
  }
}

// Export singleton
export const e2eeService = new E2EEService();
