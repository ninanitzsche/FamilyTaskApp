import { supabase } from '../config/supabase'

export async function uploadPhoto(
  familyId: number,
  sessionId: number,
  type: 'before' | 'after',
  dataUrl: string
): Promise<string | null> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Create file path: familyId/sessionId/type.jpg
    const filePath = `${familyId}/${sessionId}/${type}.jpg`

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('session-photos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('session-photos')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Failed to convert data URL to blob:', error)
    return null
  }
}
