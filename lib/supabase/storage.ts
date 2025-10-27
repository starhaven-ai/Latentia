import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for server-side storage operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Upload base64 data URL to Supabase Storage
 * @param base64DataUrl - Data URL format: data:image/png;base64,iVBORw0...
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns Public URL of uploaded file
 */
export async function uploadBase64ToStorage(
  base64DataUrl: string,
  bucket: string,
  path: string
): Promise<string> {
  try {
    // Extract base64 data and mime type
    const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid base64 data URL format')
    }

    const [, mimeType, base64Data] = matches
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path)

    return publicUrlData.publicUrl
  } catch (error: any) {
    console.error('Error uploading to storage:', error)
    throw new Error(`Failed to upload to storage: ${error.message}`)
  }
}

/**
 * Upload external URL to Supabase Storage
 * @param url - External URL to download and upload
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns Public URL of uploaded file
 */
export async function uploadUrlToStorage(
  url: string,
  bucket: string,
  path: string
): Promise<string> {
  try {
    // Fetch the image from external URL
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = response.headers.get('content-type') || 'image/png'

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path)

    return publicUrlData.publicUrl
  } catch (error: any) {
    console.error('Error uploading URL to storage:', error)
    throw new Error(`Failed to upload URL to storage: ${error.message}`)
  }
}

/**
 * Delete file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 */
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path])

    if (error) {
      throw new Error(`Storage deletion failed: ${error.message}`)
    }
  } catch (error: any) {
    console.error('Error deleting from storage:', error)
    throw new Error(`Failed to delete from storage: ${error.message}`)
  }
}

