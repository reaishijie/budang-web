export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

let toastSequence = 0

export function useToast() {
  const items = useState<ToastItem[]>('video-toasts', () => [])

  function dismiss(id: number) {
    items.value = items.value.filter(item => item.id !== id)
  }

  function show(message: string, tone: ToastTone = 'info', duration = 3200) {
    const id = ++toastSequence
    items.value = [...items.value, { id, message, tone }]
    if (import.meta.client) {
      window.setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  return {
    items,
    dismiss,
    show,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error', 4200),
    info: (message: string) => show(message, 'info'),
  }
}
