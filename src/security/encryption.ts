import crypto from 'crypto';
import { Logger } from '../utils/logger';

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
}

export class EncryptionManager {
  private logger: Logger;
  private config: EncryptionConfig;
  private masterKey: string;

  constructor(masterKey: string) {
    this.logger = new Logger();
    this.masterKey = masterKey;
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      saltLength: 32
    };
  }

  encrypt(data: string, userKey?: string): { encrypted: string; iv: string; tag: string; salt: string } {
    try {
      const salt = crypto.randomBytes(this.config.saltLength);
      const key = this.deriveKey(userKey || this.masterKey, salt);
      const iv = crypto.randomBytes(this.config.ivLength);
      
      const cipher = crypto.createCipher(this.config.algorithm, key);
      cipher.setAAD(Buffer.from('gunnchai3k', 'utf8'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  decrypt(encryptedData: { encrypted: string; iv: string; tag: string; salt: string }, userKey?: string): string {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const key = this.deriveKey(userKey || this.masterKey, salt);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.config.algorithm, key);
      decipher.setAAD(Buffer.from('gunnchai3k', 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  encryptSensitiveData(data: Record<string, any>, userKey?: string): string {
    const jsonData = JSON.stringify(data);
    const encrypted = this.encrypt(jsonData, userKey);
    return JSON.stringify(encrypted);
  }

  decryptSensitiveData(encryptedJson: string, userKey?: string): Record<string, any> {
    const encrypted = JSON.parse(encryptedJson);
    const decrypted = this.decrypt(encrypted, userKey);
    return JSON.parse(decrypted);
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateAPIKey(): string {
    const prefix = 'gai3k_';
    const randomPart = crypto.randomBytes(24).toString('base64url');
    return `${prefix}${randomPart}`;
  }

  signData(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'hex');
  }

  verifySignature(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.config.keyLength, 'sha512');
  }

  generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  encryptWithPublicKey(data: string, publicKey: string): string {
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(data, 'utf8')
    );
    return encrypted.toString('base64');
  }

  decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedData, 'base64')
    );
    return decrypted.toString('utf8');
  }
}
