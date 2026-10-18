import { computed } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'video-theme'

export function useTheme() {
  const theme = useState<Theme>('video-theme', () => 'dark')
  let media: MediaQueryList | null = null
  let onChange: ((event: MediaQueryListEvent) => void) | null = null

  function apply(next: Theme, persist = true) {
    theme.value = next
    if (!import.meta.client) return

    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Storage can be unavailable in private contexts; the theme still applies for this session.
      }
    }
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setTheme(next: Theme) {
    apply(next)
  }

  onMounted(() => {
    if (!import.meta.client) return

    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      stored = null
    }

    media = window.matchMedia('(prefers-color-scheme: dark)')
    const initial: Theme = stored === 'light' || stored === 'dark'
      ? stored
      : media.matches ? 'dark' : 'light'

    apply(initial, false)

    onChange = (event) => {
      let hasExplicitPreference = false
      try {
        hasExplicitPreference = Boolean(localStorage.getItem(STORAGE_KEY))
      } catch {
        hasExplicitPreference = false
      }
      if (!hasExplicitPreference) apply(event.matches ? 'dark' : 'light', false)
    }
    media.addEventListener('change', onChange)
  })

  onBeforeUnmount(() => {
    if (media && onChange) media.removeEventListener('change', onChange)
    media = null
    onChange = null
  })

  return {
    theme,
    isLight: computed(() => theme.value === 'light'),
    toggle,
    setTheme,
  }
}
