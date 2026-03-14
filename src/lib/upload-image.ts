import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'markdown-images';
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const COMPRESS_THRESHOLD_BYTES = 1 * 1024 * 1024; // 超过1MB自动压缩
const TARGET_MAX_DIMENSION = 1920;

function generateId() {
  return crypto.randomUUID();
}

/**
 * Compress an image file using canvas.
 * Returns the compressed file (JPEG) or original if not compressible (e.g. GIF/SVG).
 */
async function compressImage(file: File, maxDimension = TARGET_MAX_DIMENSION, quality = 0.8): Promise<File> {
  // Skip non-compressible formats
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if exceeds max dimension
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Use WebP if supported, fallback to JPEG
      const outputType = 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, use original
            resolve(file);
            return;
          }
          const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
          const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
          resolve(new File([blob], name, { type: outputType }));
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败，无法压缩'));
    };

    img.src = url;
  });
}

/**
 * Upload an image file to storage and return its public URL.
 * - Validates size limit (5MB)
 * - Auto-compresses images > 1MB
 */
export async function uploadMarkdownImage(file: File): Promise<string> {
  // Size check before compression
  if (file.size > MAX_SIZE_BYTES) {
    // Try compressing first
    const compressed = await compressImage(file);
    if (compressed.size > MAX_SIZE_BYTES) {
      throw new Error(`图片过大（${(file.size / 1024 / 1024).toFixed(1)}MB），压缩后仍超过 ${MAX_SIZE_MB}MB 限制`);
    }
    file = compressed;
  } else if (file.size > COMPRESS_THRESHOLD_BYTES) {
    // Auto compress for files > 1MB
    file = await compressImage(file);
  }

  const ext = file.name.split('.').pop() || 'png';
  const path = `${generateId()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(`上传失败: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Check if a file is a supported image type */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
