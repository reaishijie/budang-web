export interface ApiEnvelope<T> {
  success: boolean
  code: number
  message: string
  data: T
  errorCode?: string
  errors?: Array<{ path: string; message: string }>
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type UserRole = 'USER' | 'ADMIN'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
export type VideoStatus = 'PENDING' | 'REJECTED' | 'PUBLISHED' | 'SUSPENDED' | 'OFFLINE'
export type VoteType = 'LIKE' | 'DISLIKE'
export type DanmakuMode = 'SCROLL' | 'TOP' | 'BOTTOM'
export type ConfigVisibility = 'PUBLIC' | 'USER' | 'ADMIN'
export type EnergyTransactionType = 'ADMIN_ADJUST' | 'INITIAL_BONUS' | 'UPLOAD_COST' | 'REWARD' | 'PENALTY' | 'REFUND'
export type UploadPurpose = 'VIDEO' | 'IMAGE'

export interface AuthUser {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  role: UserRole
  status?: UserStatus
  canUpload: boolean
  energy: number
}

export interface AdminUser extends AuthUser {
  email: string | null
  phone: string | null
  uploadPermissionUpdatedAt?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    videos?: number
    videoComments?: number
  }
}

export interface PublicUserProfile {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  createdAt: string
  stats: {
    publishedVideos: number
    comments: number
  }
}

export interface ViewerState {
  vote: VoteType | null
  favorited: boolean
}

export interface Category {
  id: number
  name: string
  description: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count?: {
    videos?: number
  }
}

export interface VideoUploader {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
}

export interface VideoTag {
  id: number
  name: string
}

export interface VideoCounts {
  views: number
  likes: number
  dislikes: number
  favorites: number
  comments: number
}

export interface Video {
  id: number
  title: string
  description: string | null
  coverUrl: string | null
  playerIconUrl: string | null
  duration: number
  status: VideoStatus
  category: Pick<Category, 'id' | 'name'> | null
  tags: VideoTag[]
  uploader: VideoUploader | null
  counts: VideoCounts
  viewer: ViewerState
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  rejectReason?: string | null
  uploaderId?: number | null
  categoryId?: number | null
}

export interface VideoDetail extends Video {
  playbackUrl: string | null
  playbackExpiresAt: string | null
  sourceType: 'UPLOAD' | 'EXTERNAL'
  fileSize: number | null
  mimeType: string | null
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canModerate: boolean
  }
}

export interface VideoComment {
  id: number
  videoId: number
  content: string
  user: VideoUploader | null
  counts: {
    likes: number
    dislikes: number
  }
  viewerVote: VoteType | null
  createdAt: string
  updatedAt: string
}

export interface Danmaku {
  id: number
  videoId: number
  content: string
  time: number
  mode: DanmakuMode
  color: string
  createdAt: string
  user: VideoUploader | null
}

export interface DanmakuResult {
  items: Danmaku[]
  total: number
}

export type CommentSort = 'newest' | 'oldest' | 'hottest'

export interface FavoriteItem {
  favoriteId: number
  favoritedAt: string
  video: Video
}

export interface HistoryItem {
  id: number
  progressSeconds: number
  durationSeconds: number
  completed: boolean
  lastWatchedAt: string
  video: Video
}

export interface CategoryDetail extends Category {
  videos: Video[]
}

export interface TagItem {
  id: number
  name: string
  createdAt: string
  _count?: {
    videos?: number
  }
}

export interface ConfigItem {
  id: number
  k: string
  name: string
  v: string
  description: string | null
  type: string
  visible: ConfigVisibility
  createdAt: string
  updatedAt: string
}

export interface FileAsset {
  id: string
  objectKey: string
  originalName: string
  mimeType: string
  size: number
  status: 'PENDING' | 'UPLOADED'
  purpose: string | null
  publicUrl: string | null
  url?: string
  urlExpiresAt?: string | null
}

export interface PresignResponse {
  file: FileAsset
  upload: {
    url: string
    method: 'PUT'
    headers: Record<string, string>
    expiresAt: string
  }
}

export interface EnergyTransaction {
  id: number
  userId: number
  type: EnergyTransactionType
  amount: number
  balanceAfter: number
  note: string | null
  refType: string | null
  refId: string | null
  operatorId: number | null
  createdAt: string
}

export interface EnergyMe {
  id: number
  username: string
  energy: number
  recentTransactions: EnergyTransaction[]
}

export interface SiteSettings {
  name: string
  description: string
  icon: string
  keywords: string
}

export interface VideoListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number | null
  tagId?: number | null
  uploaderId?: number | null
  sort?: 'latest' | 'popular' | 'likes' | 'comments'
}
