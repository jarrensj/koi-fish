import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required. Generate one with: openssl rand -hex 64');
  }
  
  // Convert hex string to buffer
  if (key.length === 64) { // 32 bytes * 2 (hex)
    return Buffer.from(key, 'hex');
  }
  
  // Hash the key if it's not the right length
  return crypto.createHash('sha256').update(key).digest();
}

export interface EncryptionResult {
  encryptedData: string; // Base64 encoded
  iv: string; // Base64 encoded
  tag: string; // Base64 encoded
  algorithm: string;
}

export interface DecryptionInput {
  encryptedData: string; // Base64 encoded
  iv: string; // Base64 encoded
  tag: string; // Base64 encoded
  algorithm?: string;
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - The data to encrypt (as Buffer or string)
 * @returns Object containing encrypted data, IV, tag, and algorithm
 */
export function encrypt(data: Buffer | string): EncryptionResult {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from('wallet-secret', 'utf8')); // Additional authenticated data
  
  let encrypted: string;
  if (Buffer.isBuffer(data)) {
    encrypted = cipher.update(data, undefined, 'base64') + cipher.final('base64');
  } else {
    encrypted = cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
  }
  
  const tag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    algorithm: ALGORITHM
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param input - Object containing encrypted data, IV, tag, and algorithm
 * @returns Decrypted data as Buffer
 */
export function decrypt(input: DecryptionInput): Buffer {
  const { encryptedData, iv, tag, algorithm = ALGORITHM } = input;
  
  if (algorithm !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
  }
  
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, 'base64');
  const tagBuffer = Buffer.from(tag, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAAD(Buffer.from('wallet-secret', 'utf8'));
  decipher.setAuthTag(tagBuffer);
  
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return Buffer.from(decrypted, 'utf8');
}

/**
 * Encrypt a Solana wallet secret key (Uint8Array of 64 bytes)
 * @param secretKey - The wallet secret key as Uint8Array
 * @returns EncryptionResult
 */
export function encryptWalletSecret(secretKey: Uint8Array): EncryptionResult {
  if (secretKey.length !== 64) {
    throw new Error(`Invalid secret key length: expected 64 bytes, got ${secretKey.length}`);
  }
  
  return encrypt(Buffer.from(secretKey));
}

/**
 * Decrypt a Solana wallet secret key
 * @param input - DecryptionInput containing encrypted data
 * @returns Decrypted secret key as Uint8Array
 */
export function decryptWalletSecret(input: DecryptionInput): Uint8Array {
  const decrypted = decrypt(input);
  
  if (decrypted.length !== 64) {
    throw new Error(`Invalid decrypted secret key length: expected 64 bytes, got ${decrypted.length}`);
  }
  
  return new Uint8Array(decrypted);
}

/**
 * Generate a secure encryption key for production use
 * @returns Hex string representation of a random 256-bit key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Validate that an encryption key is properly formatted
 * @param key - The encryption key to validate
 * @returns True if valid, false otherwise
 */
export function validateEncryptionKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  if (key.length !== 64) return false; // 32 bytes * 2 (hex)
  return /^[0-9a-fA-F]{64}$/.test(key);
}
