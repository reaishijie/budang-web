export interface PlayerIconPreset {
  key: string
  label: string
  url: string
}

export const PLAYER_ICON_PRESETS: PlayerIconPreset[] = [
  { key: 'aperture', label: '光圈', url: '/player-icons/aperture.svg' },
  { key: 'spark', label: '星芒', url: '/player-icons/spark.svg' },
  { key: 'orbit', label: '轨道', url: '/player-icons/orbit.svg' },
  { key: 'film', label: '胶片', url: '/player-icons/film.svg' },
  { key: 'diamond', label: '棱镜', url: '/player-icons/diamond.svg' },
  { key: 'playhead', label: '指针', url: '/player-icons/playhead.svg' },
]
