import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = 'markdown-images';

/**
 * Upload an image file to storage and return its public URL.
 */
export async function uploadMarkdownImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${uuidv4()}.${ext}`;

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
