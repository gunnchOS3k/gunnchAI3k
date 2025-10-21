// gunnchAI3k Study Copilot v2 - File Storage Handler
// Manages large file storage with R2/S3 and signed URLs

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export interface StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export interface StoredFile {
  key: string;
  url: string;
  expiresAt: Date;
  size: number;
}

export class StudyFileStorage {
  private s3Client: S3Client;
  private config: StorageConfig;
  
  constructor(config: StorageConfig) {
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      endpoint: config.endpoint
    });
  }
  
  async storeFile(
    buffer: Buffer,
    filename: string,
    contentType: string = 'application/octet-stream',
    expiresInHours: number = 24
  ): Promise<StoredFile> {
    const key = this.generateKey(filename);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Expires: expiresAt
      });
      
      await this.s3Client.send(command);
      
      const url = await this.getSignedUrl(key, expiresInHours);
      
      return {
        key,
        url,
        expiresAt,
        size: buffer.length
      };
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error('Failed to store file');
    }
  }
  
  async getSignedUrl(key: string, expiresInHours: number = 24): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });
      
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInHours * 60 * 60
      });
      
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }
  
  private generateKey(filename: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = filename.split('.').pop() || '';
    return `study-packs/${timestamp}-${random}.${extension}`;
  }
}

// Mock storage for development/testing
export class MockStorage {
  private files: Map<string, Buffer> = new Map();
  
  async storeFile(
    buffer: Buffer,
    filename: string,
    contentType: string = 'application/octet-stream',
    expiresInHours: number = 24
  ): Promise<StoredFile> {
    const key = `mock-${Date.now()}-${filename}`;
    this.files.set(key, buffer);
    
    return {
      key,
      url: `https://mock-storage.example.com/${key}`,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      size: buffer.length
    };
  }
  
  async getSignedUrl(key: string, expiresInHours: number = 24): Promise<string> {
    return `https://mock-storage.example.com/${key}?expires=${Date.now() + expiresInHours * 60 * 60 * 1000}`;
  }
}

// File size limits
export const FILE_LIMITS = {
  DISCORD_NON_NITRO: 10 * 1024 * 1024, // 10 MB
  DISCORD_NITRO: 25 * 1024 * 1024, // 25 MB
  MAX_RECOMMENDED: 50 * 1024 * 1024 // 50 MB
};

export function shouldUseExternalStorage(fileSize: number, isNitro: boolean = false): boolean {
  const limit = isNitro ? FILE_LIMITS.DISCORD_NITRO : FILE_LIMITS.DISCORD_NON_NITRO;
  return fileSize > limit;
}

export function getFileSizeString(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Storage factory
export function createStorage(config?: StorageConfig): StudyFileStorage | MockStorage {
  if (config && config.bucket && config.accessKeyId && config.secretAccessKey) {
    return new StudyFileStorage(config);
  } else {
    console.log('Using mock storage for development');
    return new MockStorage();
  }
}

// File type detection
export function getFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

// File validation
export function validateFile(filename: string, size: number): { valid: boolean; error?: string } {
  // Check file extension
  const allowedExtensions = ['pptx', 'docx', 'pdf', 'txt', 'zip'];
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File type .${extension} not supported. Allowed: ${allowedExtensions.join(', ')}`
    };
  }
  
  // Check file size
  if (size > FILE_LIMITS.MAX_RECOMMENDED) {
    return {
      valid: false,
      error: `File too large (${getFileSizeString(size)}). Maximum recommended: ${getFileSizeString(FILE_LIMITS.MAX_RECOMMENDED)}`
    };
  }
  
  return { valid: true };
}

