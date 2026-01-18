import { supabase } from './supabase';

export async function uploadGrantDocument(file: File, grantId: number): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${grantId}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('grant-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('grant-documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function deleteGrantDocument(documentUrl: string): Promise<void> {
  const fileName = documentUrl.split('/').pop();
  if (!fileName) return;

  const { error } = await supabase.storage
    .from('grant-documents')
    .remove([fileName]);

  if (error) {
    throw error;
  }
}
