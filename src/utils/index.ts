import crypto from 'crypto';

/**
 * Formats file size in bytes to a human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats a date to a human-readable string
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString();
}

/**
 * Truncates text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generates a secure random string for various purposes
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Creates a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Validates file type against allowed types
 */
export function isAllowedFileType(
  fileType: string,
  allowedTypes: string[] = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mpeg', 'video/webm',
    'application/pdf'
  ]
): boolean {
  return allowedTypes.includes(fileType);
}

/**
 * Determines if a file is an image based on its MIME type
 */
export function isImage(fileType: string): boolean {
  return fileType.startsWith('image/');
}

/**
 * Determines if a file is a video based on its MIME type
 */
export function isVideo(fileType: string): boolean {
  return fileType.startsWith('video/');
}

/**
 * Maps file type to an appropriate category label
 */
export function getMediaTypeLabel(fileType: string): string {
  if (isImage(fileType)) return 'Image';
  if (isVideo(fileType)) return 'Video';
  if (fileType === 'application/pdf') return 'PDF';
  if (fileType.includes('word')) return 'Document';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'Spreadsheet';
  return 'File';
}