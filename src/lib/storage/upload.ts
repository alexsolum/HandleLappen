import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Compresses an image file using canvas and returns a WebP blob.
 * Max width is enforced while maintaining aspect ratio.
 */
export async function compressImage(file: File, maxWidth = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Canvas toBlob failed'))
            }
          },
          'image/webp',
          0.8 // Quality
        )
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compresses and uploads a recipe image to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadRecipeImage(
  supabase: SupabaseClient,
  householdId: string,
  file: File
): Promise<string> {
  const compressedBlob = await compressImage(file)
  const fileName = `${crypto.randomUUID()}.webp`
  const filePath = `${householdId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('recipes')
    .upload(filePath, compressedBlob, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('recipes').getPublicUrl(filePath)
  return data.publicUrl
}
