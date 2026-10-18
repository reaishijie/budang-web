export function formatCount(value: number | null | undefined): string {
  const count = Number(value ?? 0)
  if (count >= 100_000_000) return `${(count / 100_000_000).toFixed(1).replace(/\.0$/, '')}亿`
  if (count >= 10_000) return `${(count / 10_000).toFixed(1).replace(/\.0$/, '')}万`
  return String(count)
}

export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(seconds ?? 0)))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function formatBytes(value: number | null | undefined): string {
  const bytes = Number(value ?? 0)
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (!withTime) return `${year}.${month}.${day}`
  return `${year}.${month}.${day} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '—'
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return '—'
  const diff = Date.now() - time
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return formatDate(value)
}

export function progressPercent(progress: number, duration: number): number {
  if (!duration || duration <= 0) return 0
  return Math.min(100, Math.max(0, (progress / duration) * 100))
}

export function initials(name: string | null | undefined): string {
  const text = (name ?? '').trim()
  if (!text) return '光'
  return [...text].slice(0, 2).join('')
}

export function avatarHue(name: string | null | undefined): number {
  const text = name ?? 'guest'
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

export const VIDEO_STATUS_LABEL: Record<string, string> = {
  PENDING: '待审核',
  REJECTED: '已驳回',
  PUBLISHED: '已发布',
  SUSPENDED: '已下架',
  OFFLINE: '已下线',
}

export function videoStatusTone(status: string): 'amber' | 'green' | 'red' | 'muted' {
  if (status === 'PUBLISHED') return 'green'
  if (status === 'PENDING') return 'amber'
  if (status === 'REJECTED' || status === 'SUSPENDED') return 'red'
  return 'muted'
}

export function truncate(text: string | null | undefined, length = 120): string {
  const value = (text ?? '').trim()
  if (value.length <= length) return value
  return `${value.slice(0, length)}…`
}
