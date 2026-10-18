import { useApi } from '~/composables/useApi'
import type { FileAsset, PresignResponse, UploadPurpose } from '~/types'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const PLAYER_ICON_TYPES = [...IMAGE_TYPES, 'image/svg+xml']
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
    if (purpose === 'PLAYER_ICON' && !PLAYER_ICON_TYPES.includes(file.type)) {
      throw new Error('进度图标仅支持 JPEG / PNG / WebP / GIF / SVG')
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

  /**
   * 从公开视频 URL 读取 metadata 时长。
   * 跨域视频通常仍能读取 loadedmetadata；失败/超时则由用户手动填写。
   */
  function videoDurationFromUrl(url: string, timeoutMs = 8_000): Promise<number> {
    return new Promise((resolve) => {
      if (!/^https?:\/\//i.test(url)) {
        resolve(0)
        return
      }
      const video = document.createElement('video')
      let settled = false
      const finish = (duration: number) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        video.removeAttribute('src')
        video.load()
        resolve(duration)
      }
      const timer = setTimeout(() => finish(0), timeoutMs)
      video.preload = 'metadata'
      video.muted = true
      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 0
        finish(duration > 0 ? duration : 0)
      }
      video.onerror = () => finish(0)
      video.src = url
    })
  }

  return { upload, videoDuration, videoDurationFromUrl }
}
