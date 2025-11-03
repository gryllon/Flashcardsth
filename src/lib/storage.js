import { supabase } from './supabase'; // Assuming supabase client is exported from here

const BUCKET_NAME = 'flashcards-image'; // Your bucket name

export async function uploadImageToSupabase(file, userId) {
  if (!file || !userId) {
    throw new Error('File and userId are required for image upload.');
  }

  const fileExt = file.name.split('.').pop();
  // Create a unique path: userId/timestamp.extension
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600', // Cache for 1 hour
        upsert: false, // Do not overwrite existing files
      });

    if (error) {
      throw error;
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Could not retrieve public URL for the uploaded image.');
    }

    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Error uploading image to Supabase Storage:', error.message);
    throw error; // Re-throw to be handled by the calling component
  }
}

export async function deleteImageFromSupabase(imageUrl) {
  if (!imageUrl) {
    console.warn('No image URL provided for deletion.');
    return;
  }

  try {
    // Extract the file path from the public URL
    // Example URL: https://[project_ref].supabase.co/storage/v1/object/public/flashcards-image/user_id/timestamp.ext
    const urlParts = imageUrl.split('/');
    // The path starts after 'public/flashcards-image/'
    const filePath = urlParts.slice(urlParts.indexOf(BUCKET_NAME) + 1).join('/');

    if (!filePath) {
      throw new Error('Could not extract file path from image URL.');
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw error;
    }
    console.log(`Image ${filePath} deleted successfully from Supabase Storage.`);
  } catch (error) {
    console.error('Error deleting image from Supabase Storage:', error.message);
    throw error; // Re-throw to be handled by the calling component
  }
}
