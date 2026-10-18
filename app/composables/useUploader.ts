import { useApi } from '~/composables/useApi'
import type { FileAsset, PresignResponse, UploadPurpose } from '~/types'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg']

export function useUploader() {
  const api = useApi()

  async function upload(
    file: File,
    purpose: UploadPurpose,
    onProgress?: (percent: number) => void,
  ): Promise<FileAsset> {
    if (purpose === 'VIDEO' && !VIDEO_TYPES.includes(file.type)) {
      throw new Error('仅支持 MP4 / WebM / MOV / M4V / OGG 视频')
    }
    if (purpose === 'IMAGE' && !IMAGE_TYPES.includes(file.type)) {
      throw new Error('仅支持 JPEG / PNG / WebP / GIF 图片')
    }

    const presign = await api.post<PresignResponse>('/api/backend/api/uploads/presign', {
      purpose,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    })

    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open(presign.upload.method, presign.upload.url, true)
      for (const [key, value] of Object.entries(presign.upload.headers)) {
        request.setRequestHeader(key, value)
      }
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.(Math.round((event.loaded / event.total) * 100))
        }
      }
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve()
        } else {
          reject(new Error(`文件直传失败（${request.status}）`))
        }
      }
      request.onerror = () => reject(new Error('文件直传失败，请检查对象存储 CORS 配置'))
      request.send(file)
    })

    onProgress?.(100)
    return api.post<FileAsset>(`/api/backend/api/uploads/${encodeURIComponent(presign.file.id)}/complete`)
  }

  function videoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 0
        URL.revokeObjectURL(url)
        resolve(duration)
      }
      video.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(0)
      }
      video.src = url
    })
  }

  return { upload, videoDuration }
}
