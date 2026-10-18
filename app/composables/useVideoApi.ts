import { useApi } from '~/composables/useApi'
import type {
  AdminUser,
  AuthUser,
  Category,
  CategoryDetail,
  CommentSort,
  ConfigItem,
  ConfigVisibility,
  EnergyMe,
  EnergyTransaction,
  FavoriteItem,
  FileAsset,
  HistoryItem,
  PaginatedResult,
  PublicUserProfile,
  TagItem,
  Video,
  VideoComment,
  VideoDetail,
  VideoListQuery,
  VideoStatus,
  VoteType,
} from '~/types'

type AdminVideoQuery = {
  page?: number
  pageSize?: number
  keyword?: string
  status?: VideoStatus | ''
}

type AdminUserQuery = {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  role?: string
  canUpload?: string
}

type ConfigQuery = {
  page?: number
  pageSize?: number
  type?: string
  keyword?: string
  visible?: ConfigVisibility | ''
}

const API = '/api/backend/api'

export function useVideoApi() {
  const api = useApi()

  return {
    // 分类与标签
    listCategories: (page = 1, pageSize = 100, keyword?: string) =>
      api.get<PaginatedResult<Category>>(`${API}/categories`, { page, pageSize, keyword }),
    getCategory: (id: number) =>
      api.get<CategoryDetail>(`${API}/categories/${id}`),
    createCategory: (body: { name: string; description?: string | null; sortOrder?: number }) =>
      api.post<Category>(`${API}/categories`, body),
    updateCategory: (id: number, body: Record<string, unknown>) =>
      api.patch<Category>(`${API}/categories/${id}`, body),
    deleteCategory: (id: number) => api.delete<null>(`${API}/categories/${id}`),

    listTags: (page = 1, pageSize = 100, keyword?: string) =>
      api.get<PaginatedResult<TagItem>>(`${API}/tags`, { page, pageSize, keyword }),
    createTag: (name: string) => api.post<TagItem>(`${API}/tags`, { name }),
    updateTag: (id: number, name: string) => api.patch<TagItem>(`${API}/tags/${id}`, { name }),
    deleteTag: (id: number) => api.delete<null>(`${API}/tags/${id}`),

    // 视频
    listVideos: (query: VideoListQuery) =>
      api.get<PaginatedResult<Video>>(`${API}/videos`, query as Record<string, string | number>),
    getVideo: (id: number) => api.get<VideoDetail>(`${API}/videos/${id}`),
    listMyVideos: (query: AdminVideoQuery) =>
      api.get<PaginatedResult<Video>>(`${API}/videos/mine`, query as Record<string, string | number>),
    listReviewQueue: (query: AdminVideoQuery) =>
      api.get<PaginatedResult<Video>>(`${API}/videos/admin/review-queue`, query as Record<string, string | number>),
    createVideo: (body: Record<string, unknown>) =>
      api.post<VideoDetail>(`${API}/videos`, body),
    updateVideo: (id: number, body: Record<string, unknown>) =>
      api.patch<VideoDetail>(`${API}/videos/${id}`, body),
    updateVideoStatus: (id: number, body: { status: VideoStatus; rejectReason?: string | null }) =>
      api.patch<VideoDetail>(`${API}/videos/${id}/status`, body),
    resubmitVideo: (id: number) => api.post<VideoDetail>(`${API}/videos/${id}/resubmit`),
    deleteVideo: (id: number) => api.delete<null>(`${API}/videos/${id}`),

    // 互动
    voteVideo: (id: number, vote: VoteType | null) =>
      api.put<{ likeCount: number; dislikeCount: number; userVote: VoteType | null }>(`${API}/videos/${id}/vote`, { vote }),
    favoriteVideo: (id: number, favorited: boolean) =>
      api.put<{ favorited: boolean; favoriteCount: number }>(`${API}/videos/${id}/favorite`, { favorited }),
    recordView: (id: number, body: { progressSeconds?: number; durationSeconds?: number } = {}) =>
      api.post<{ viewCount: number }>(`${API}/videos/${id}/view`, body),
    updateProgress: (id: number, body: { progressSeconds: number; durationSeconds: number }) =>
      api.put<{ progressSeconds: number; completed: boolean }>(`${API}/videos/${id}/progress`, body),

    // 评论
    listComments: (videoId: number, page = 1, pageSize = 20, sort: CommentSort = 'newest') =>
      api.get<PaginatedResult<VideoComment>>(`${API}/videos/${videoId}/comments`, { page, pageSize, sort }),
    createComment: (videoId: number, content: string) =>
      api.post<VideoComment>(`${API}/videos/${videoId}/comments`, { content }),
    deleteComment: (videoId: number, commentId: number) =>
      api.delete<null>(`${API}/videos/${videoId}/comments/${commentId}`),
    voteComment: (videoId: number, commentId: number, vote: VoteType | null) =>
      api.put<{ likeCount: number; dislikeCount: number; userVote: VoteType | null }>(
        `${API}/videos/${videoId}/comments/${commentId}/vote`,
        { vote },
      ),

    // 收藏与历史
    listFavorites: (page = 1, pageSize = 12) =>
      api.get<PaginatedResult<FavoriteItem>>(`${API}/favorites`, { page, pageSize }),
    listHistory: (page = 1, pageSize = 12) =>
      api.get<PaginatedResult<HistoryItem>>(`${API}/history`, { page, pageSize }),
    removeHistory: (videoId: number) => api.delete<{ removed: number }>(`${API}/history/${videoId}`),
    clearHistory: () => api.delete<{ removed: number }>(`${API}/history`),

    // 用户
    getPublicUser: (username: string) =>
      api.get<PublicUserProfile>(`${API}/users/${encodeURIComponent(username)}`),
    listUsers: (query: AdminUserQuery) =>
      api.get<PaginatedResult<AdminUser>>(`${API}/users`, query as Record<string, string | number>),
    updateUser: (username: string, body: Record<string, unknown>) =>
      api.patch<AdminUser>(`${API}/users/${encodeURIComponent(username)}`, body),
    setUploadPermission: (username: string, canUpload: boolean) =>
      api.patch<AdminUser>(`${API}/users/${encodeURIComponent(username)}/upload-permission`, { canUpload }),
    deleteUser: (username: string) =>
      api.delete<null>(`${API}/users/${encodeURIComponent(username)}`),

    // 能量
    getEnergyMe: () => api.get<EnergyMe>(`${API}/energy/me`),
    listEnergyTransactions: (page = 1, pageSize = 20) =>
      api.get<PaginatedResult<EnergyTransaction>>(`${API}/energy/transactions`, { page, pageSize }),
    adjustEnergy: (body: { username: string; amount: number; note?: string }) =>
      api.post<{ user: Pick<AuthUser, 'id' | 'username' | 'energy'>; transaction: EnergyTransaction }>(
        `${API}/energy/adjust`,
        body,
      ),

    // 配置
    listConfigs: (query: ConfigQuery = {}) =>
      api.get<PaginatedResult<ConfigItem>>(`${API}/configs`, query as Record<string, string | number>),
    listConfigTypes: () => api.get<string[]>(`${API}/configs/types`),
    getConfig: (type: string, key: string) =>
      api.get<ConfigItem>(`${API}/configs/${encodeURIComponent(type)}/${encodeURIComponent(key)}`),
    createConfig: (body: Record<string, unknown>) => api.post<ConfigItem>(`${API}/configs`, body),
    updateConfig: (id: number, body: Record<string, unknown>) => api.patch<ConfigItem>(`${API}/configs/${id}`, body),
    deleteConfig: (id: number) => api.delete<null>(`${API}/configs/${id}`),

    // 文件
    listFiles: (page = 1, pageSize = 20) =>
      api.get<PaginatedResult<FileAsset>>(`${API}/files`, { page, pageSize }),
    getFile: (id: string) => api.get<FileAsset>(`${API}/files/${encodeURIComponent(id)}`),
  }
}
