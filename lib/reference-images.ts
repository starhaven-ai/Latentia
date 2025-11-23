import { createHash } from 'crypto'

export interface ReferenceImagePointer {
  referenceImageId: string
  referenceImageBucket: string
  referenceImagePath: string
  referenceImageUrl: string
  referenceImageChecksum: string
  referenceImageMimeType: string
}

const DEFAULT_BUCKET = 'generated-images'
type Uploader = (base64DataUrl: string, bucket: string, path: string) => Promise<string>

export async function persistReferenceImage(
  base64DataUrl: string,
  userId: string,
  referenceImageId?: string,
  uploader?: Uploader
): Promise<ReferenceImagePointer> {
  const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid reference image format. Expected data URL.')
  }

  const [, mimeType, base64Payload] = matches
  const extension = mimeType.includes('png') ? 'png' : 'jpg'
  const checksum = createHash('sha256').update(base64Payload).digest('hex')
  const pointerId = referenceImageId || `ref-${Date.now()}`
  const storagePath = `references/${userId}/${pointerId}.${extension}`
  const resolvedUploader =
    uploader ?? (await import('@/lib/supabase/storage')).uploadBase64ToStorage
  const publicUrl = await resolvedUploader(base64DataUrl, DEFAULT_BUCKET, storagePath)

  return {
    referenceImageId: pointerId,
    referenceImageBucket: DEFAULT_BUCKET,
    referenceImagePath: storagePath,
    referenceImageUrl: publicUrl,
    referenceImageChecksum: checksum,
    referenceImageMimeType: mimeType,
  }
}

export async function downloadReferenceImageAsDataUrl(
  url: string,
  mimeHint?: string,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const response = await fetcher(url)
  if (!response.ok) {
    throw new Error(`Failed to download reference image: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mimeType = mimeHint || response.headers.get('content-type') || 'image/jpeg'
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

