/**
 * File Storage Service
 *
 * Handles file uploads for avatars and other user content.
 * Uses local filesystem storage (can be migrated to S3 later).
 */
import type { MultipartFile } from '@fastify/multipart';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { ValidationError } from '../plugins/error-handler.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB default
const API_URL = process.env.API_URL || 'http://localhost:3001';

export interface SaveFileResult {
  filePath: string; // Relative path for storage
  publicUrl: string; // URL for serving
}

export class FileStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * Initialize upload directories
   */
  async init(): Promise<void> {
    const avatarsDir = path.join(this.uploadDir, 'avatars');
    await fs.mkdir(avatarsDir, { recursive: true });
  }

  /**
   * Save an avatar file
   *
   * @param userId - User ID for filename
   * @param file - Multipart file from request
   * @returns File path and public URL
   * @throws ValidationError if file type or size is invalid
   */
  async saveAvatar(userId: string, file: MultipartFile): Promise<SaveFileResult> {
    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Get file extension from mimetype
    const ext = this.getExtension(file.mimetype);
    const timestamp = Date.now();
    const filename = `${userId}-${timestamp}.${ext}`;
    const relativePath = `avatars/${filename}`;
    const fullPath = path.join(this.uploadDir, relativePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Stream file to disk with size limit
    const writeStream = createWriteStream(fullPath);
    let bytesWritten = 0;

    try {
      const fileStream = file.file;

      // Check size as we stream - use destroy(error) to properly propagate
      fileStream.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        if (bytesWritten > MAX_FILE_SIZE) {
          const error = new ValidationError(
            `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
          );
          fileStream.destroy(error);
        }
      });

      await pipeline(fileStream, writeStream);
    } catch (error) {
      // Clean up partial file on error (best-effort, log if cleanup fails)
      await fs.unlink(fullPath).catch((cleanupError) => {
        // Cleanup failure is less important than the original error
        console.warn('Failed to cleanup partial file:', { fullPath, cleanupError });
      });
      throw error;
    }

    return {
      filePath: relativePath,
      publicUrl: `${API_URL}/uploads/${relativePath}`,
    };
  }

  /**
   * Delete a file
   *
   * @param filePath - Relative path to file (e.g., "avatars/user-123.jpg")
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) return;

    const fullPath = path.join(this.uploadDir, filePath);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Delete an avatar by its public URL
   *
   * @param avatarUrl - Public URL (e.g., "http://localhost:3001/uploads/avatars/user-123.jpg")
   */
  async deleteAvatar(avatarUrl: string | null): Promise<void> {
    if (!avatarUrl) return;

    // Extract relative path from URL (handles both full URL and relative path)
    const relativePath = avatarUrl
      .replace(/^https?:\/\/[^/]+/, '') // Remove domain
      .replace(/^\/uploads\//, ''); // Remove /uploads/ prefix
    await this.deleteFile(relativePath);
  }

  /**
   * Get file extension from mime type
   */
  private getExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return mimeToExt[mimeType] || 'jpg';
  }
}
