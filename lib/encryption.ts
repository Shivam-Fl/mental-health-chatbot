/**
 * Encryption utilities for securing sensitive chat data
 * Uses AES-256-GCM encryption for chat messages
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derives a key from the encryption key environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CHAT_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('CHAT_ENCRYPTION_KEY environment variable is required. Generate one with: openssl rand -base64 32');
  }
  
  // Derive a proper key from the provided key
  return crypto.scryptSync(key, 'mental-health-chat', KEY_LENGTH);
}

/**
 * Encrypts sensitive message content
 * @param text The plaintext message to encrypt
 * @returns Encrypted text in format: salt:iv:tag:encrypted
 */
export function encryptMessage(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return format: salt:iv:tag:encrypted
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted
    ].join(':');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypts encrypted message content
 * @param encryptedText The encrypted text in format: salt:iv:tag:encrypted
 * @returns Decrypted plaintext message
 */
export function decryptMessage(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted message format');
    }
    
    const [saltHex, ivHex, tagHex, encrypted] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Hashes sensitive data for storage (one-way)
 * Useful for data that needs to be verified but not retrieved
 */
export function hashData(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Generates a secure random token
 * Useful for session tokens, verification codes, etc.
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
