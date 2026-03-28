import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a file in storage.
 * Uses time-limited signed URLs instead of public URLs for security.
 * 
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if error
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path) return null;
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
}

/**
 * Extract the file path from a full storage URL.
 * Handles both public URLs and signed URLs.
 * 
 * @param url - The full storage URL
 * @param bucket - The bucket name to extract path for
 * @returns The file path or null if not a valid storage URL
 */
export function extractFilePath(url: string | null, bucket: string): string | null {
  if (!url) return null;
  
  try {
    // Match pattern: /storage/v1/object/public/{bucket}/ or /storage/v1/object/sign/{bucket}/
    const publicPattern = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+?)(?:\\?|$)`);
    const match = url.match(publicPattern);
    
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    
    // Try to extract from the end of the URL if it's a simple path
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${bucket}/`);
    if (pathParts.length > 1) {
      return decodeURIComponent(pathParts[1].split('?')[0]);
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Upload a file to storage and return a signed URL.
 * 
 * @param bucket - The storage bucket name
 * @param path - The file path to upload to
 * @param file - The file to upload
 * @param options - Upload options
 * @returns Object with signedUrl and path, or null on error
 */
export async function uploadFileSecurely(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<{ signedUrl: string; path: string } | null> {
  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: options?.upsert ?? true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const signedUrl = await getSignedUrl(bucket, path);
    if (!signedUrl) {
      return null;
    }

    return { signedUrl, path };
  } catch (err) {
    console.error('Error uploading file:', err);
    return null;
  }
}
