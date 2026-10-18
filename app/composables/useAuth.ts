import { computed } from 'vue'
import { ApiRequestError, useApi } from '~/composables/useApi'
import type { AuthUser } from '~/types'

export function useAuth() {
  const api = useApi()
  const user = useState<AuthUser | null>('video-auth-user', () => null)
  const initialized = useState('video-auth-initialized', () => false)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const canUpload = computed(() => Boolean(user.value && (user.value.role === 'ADMIN' || user.value.canUpload)))

  async function loadUser(force = false): Promise<AuthUser | null> {
    if (initialized.value && !force) return user.value

    try {
      user.value = await api.get<AuthUser>('/api/auth/me')
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        user.value = null
        initialized.value = true
        return null
      }
      throw error
    }

    initialized.value = true
    return user.value
  }

  async function login(username: string, password: string): Promise<AuthUser> {
    const result = await api.post<{ user: AuthUser }>('/api/auth/login', {
      username,
      password,
      clientType: 'web',
    })
    user.value = result.user
    initialized.value = true
    return result.user
  }

  async function register(input: {
    username: string
    password: string
    nickname?: string
    email?: string
    phone?: string
  }) {
    return api.post('/api/auth/register', input)
  }

  async function updateProfile(input: { nickname?: string | null; avatar?: string | null }): Promise<AuthUser> {
    const updated = await api.patch<AuthUser>('/api/auth/me', input)
    user.value = { ...user.value, ...updated } as AuthUser
    initialized.value = true
    return user.value as AuthUser
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch<null>('/api/auth/password', { currentPassword, newPassword })
    user.value = null
    initialized.value = true
  }

  async function logout(allDevices = false): Promise<void> {
    try {
      await api.post<null>(allDevices ? '/api/auth/logout-all' : '/api/auth/logout')
    } finally {
      user.value = null
      initialized.value = true
    }
  }

  return {
    user,
    initialized,
    isAdmin,
    canUpload,
    loadUser,
    login,
    register,
    updateProfile,
    changePassword,
    logout,
  }
}
