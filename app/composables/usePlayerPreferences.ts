import { reactive, watch } from 'vue'
import type { DanmakuMode } from '~/types'

export type PlayerSkin = 'amber' | 'ivory' | 'neon' | 'crimson'

export interface PlayerPreferences {
  volume: number
  muted: boolean
  rate: number
  seekStep: number
  danmakuEnabled: boolean
  danmakuOpacity: number
  danmakuFontSize: number
  danmakuArea: number
  danmakuColor: string
  danmakuMode: DanmakuMode
  skin: PlayerSkin
}

const STORAGE_KEY = 'budang-player-preferences'
const LEGACY_STORAGE_KEY = 'guangying-player-preferences'

const defaults: PlayerPreferences = {
  volume: 0.8,
  muted: false,
  rate: 1,
  seekStep: 5,
  danmakuEnabled: true,
  danmakuOpacity: 0.9,
  danmakuFontSize: 18,
  danmakuArea: 0.6,
  danmakuColor: '#f3efe4',
  danmakuMode: 'SCROLL',
  skin: 'amber',
}

const skins: PlayerSkin[] = ['amber', 'ivory', 'neon', 'crimson']
const modes: DanmakuMode[] = ['SCROLL', 'TOP', 'BOTTOM']
const seekSteps = [5, 10, 15, 30]
const hexColor = /^#[0-9a-fA-F]{6}$/

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

export function usePlayerPreferences() {
  const prefs = reactive<PlayerPreferences>({ ...defaults })

  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
      if (!raw) return
      if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, raw)
      const saved = JSON.parse(raw) as Partial<PlayerPreferences>
      prefs.volume = clampNumber(saved.volume, 0, 1, defaults.volume)
      prefs.muted = typeof saved.muted === 'boolean' ? saved.muted : defaults.muted
      prefs.rate = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(Number(saved.rate))
        ? Number(saved.rate)
        : defaults.rate
      prefs.seekStep = seekSteps.includes(Number(saved.seekStep))
        ? Number(saved.seekStep)
        : defaults.seekStep
      prefs.danmakuEnabled = typeof saved.danmakuEnabled === 'boolean' ? saved.danmakuEnabled : defaults.danmakuEnabled
      prefs.danmakuOpacity = clampNumber(saved.danmakuOpacity, 0.25, 1, defaults.danmakuOpacity)
      prefs.danmakuFontSize = [14, 18, 22].includes(Number(saved.danmakuFontSize))
        ? Number(saved.danmakuFontSize)
        : defaults.danmakuFontSize
      prefs.danmakuArea = [0.3, 0.6, 0.9].includes(Number(saved.danmakuArea))
        ? Number(saved.danmakuArea)
        : defaults.danmakuArea
      prefs.danmakuColor = typeof saved.danmakuColor === 'string' && hexColor.test(saved.danmakuColor)
        ? saved.danmakuColor
        : defaults.danmakuColor
      prefs.danmakuMode = modes.includes(saved.danmakuMode as DanmakuMode)
        ? saved.danmakuMode as DanmakuMode
        : defaults.danmakuMode
      prefs.skin = skins.includes(saved.skin as PlayerSkin) ? saved.skin as PlayerSkin : defaults.skin
    } catch {
      // A corrupted local preference should never stop playback.
    }
  }

  if (import.meta.client) {
    watch(prefs, () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      } catch {
        // Ignore unavailable storage.
      }
    }, { deep: true })
  }

  return { prefs, load }
}
