<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  size?: number
}>(), {
  size: 18,
})

const icons: Record<string, string> = {
  play: '<path d="M8 5.5 18.5 12 8 18.5Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="2.2"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4v4.5h4.5"/>',
  back10: '<path d="M4.5 9.5V4.8M4.5 9.5h4.7"/><path d="M4.9 9.1A7.2 7.2 0 1 1 4.8 15"/><text x="9.2" y="15.7" font-size="6.2" fill="currentColor" stroke="none" font-family="monospace">10</text>',
  forward10: '<path d="M19.5 9.5V4.8M19.5 9.5h-4.7"/><path d="M19.1 9.1A7.2 7.2 0 1 0 19.2 15"/><text x="8.6" y="15.7" font-size="6.2" fill="currentColor" stroke="none" font-family="monospace">10</text>',
  volume: '<path d="M4 9.2h3.2L12 5.4v13.2L7.2 14.8H4Z"/><path d="M15.4 9a4.2 4.2 0 0 1 0 6M18 6.6a7.5 7.5 0 0 1 0 10.8"/>',
  mute: '<path d="M4 9.2h3.2L12 5.4v13.2L7.2 14.8H4Z"/><path d="m16 9 4 6m0-6-4 6"/>',
  danmaku: '<path d="M4 5.5h16v11H9l-4 3v-3H4Z"/><path d="M8 9.5h8M8 12.5h5.5"/>',
  danmakuOff: '<path d="M4 5.5h16v11H9l-4 3v-3H4Z"/><path d="m8.5 9 5 5m0-5-5 5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  fullscreenExit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  pip: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><rect x="12" y="11.5" width="6" height="5" rx="1" fill="currentColor" stroke="none"/>',
  send: '<path d="m3.5 11.5 17-7-5.8 15-3.2-6.2-6.8-1.8Z"/><path d="m11.5 13.3 4.8-4.8"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.2a1.8 1.8 0 0 0 1.3-3 1.8 1.8 0 0 1 1.3-3H18a2.5 2.5 0 0 0 2.5-2.5A8.5 8.5 0 0 0 12 3.5Z"/><circle cx="8" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="9" r="1" fill="currentColor" stroke="none"/>',
  spark: '<path d="M12 3.5c.5 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z" fill="currentColor" stroke="none"/>',
  glyphTriangle: '<path d="M8 4.8 21 12 8 19.2Z" fill="currentColor" stroke="none"/>',
  glyphAperture: '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8 16.5 12M20.2 12h-8.7M16.5 18.9 12 12M7.5 18.9 12 12M3.8 12h8.7M7.5 5.1 12 12" stroke-width="1.4"/>',
  glyphSpark: '<path d="M12 2.8c.7 5.8 3.4 8.5 9.2 9.2-5.8.7-8.5 3.4-9.2 9.2-.7-5.8-3.4-8.5-9.2-9.2 5.8-.7 8.5-3.4 9.2-9.2Z" fill="currentColor" stroke="none"/>',
  glyphRing: '<circle cx="12" cy="12" r="8.5" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
}

defineOptions({ name: 'PlayerIcon' })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="icons[name] || icons.play"
  />
</template>
