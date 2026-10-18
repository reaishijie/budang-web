<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  size?: number
  strokeWidth?: number
}>(), {
  size: 18,
  strokeWidth: 1.6,
})

const icons: Record<string, string> = {
  play: '<path d="M8 5.2v13.6L19 12 8 5.2Z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.8-3.4 3.5-5.4 7.2-5.4s6.4 2 7.2 5.4"/>',
  clock: '<circle cx="12" cy="12" r="8.3"/><path d="M12 7.5V12l3 2"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10Z"/>',
  heartFilled: '<path d="M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10Z" fill="currentColor" stroke="none"/>',
  bookmark: '<path d="M6.5 4.5h11v15L12 15.7l-5.5 3.8v-15Z"/>',
  bookmarkFilled: '<path d="M6.5 4.5h11v15L12 15.7l-5.5 3.8v-15Z" fill="currentColor" stroke="none"/>',
  thumbsUp: '<path d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1H7Z"/><path d="M7 10.5 10.8 4a2.2 2.2 0 0 1 2.1 2.2v3.3h4.6a2 2 0 0 1 2 2.4l-1.1 5.6a2 2 0 0 1-2 1.6H7"/>',
  thumbsDown: '<path d="M17 13.5v-9h2.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H17Z"/><path d="M17 13.5 13.2 20a2.2 2.2 0 0 1-2.1-2.2v-3.3H6.5a2 2 0 0 1-2-2.4l1.1-5.6a2 2 0 0 1 2-1.6H17"/>',
  eye: '<path d="M2.8 12S6 6.2 12 6.2 21.2 12 21.2 12 18 17.8 12 17.8 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.6"/>',
  message: '<path d="M20 11.5a7.3 7.3 0 0 1-7.5 7.2 8 8 0 0 1-2.7-.5L5 20l1.2-3.7A7 7 0 0 1 4.5 11.5 7.3 7.3 0 0 1 12 4.3a7.3 7.3 0 0 1 8 7.2Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.3 4.3L19 7"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5"/>',
  edit: '<path d="m14.5 5.5 4 4M4 20l1-5L16.5 3.5a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L9 19l-5 1Z"/>',
  logout: '<path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14"/><path d="M17 8.5 20.5 12 17 15.5M10 12h10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.4 7.4 0 0 0 0-3l1.7-1.3-2-3.4-2 .8a7.4 7.4 0 0 0-2.6-1.5L13.7 4h-3.4l-.4 2.1a7.4 7.4 0 0 0-2.6 1.5l-2-.8-2 3.4L5 11.5a7.4 7.4 0 0 0 0 3l-1.7 1.3 2 3.4 2-.8a7.4 7.4 0 0 0 2.6 1.5l.4 2.1h3.4l.4-2.1a7.4 7.4 0 0 0 2.6-1.5l2 .8 2-3.4-1.7-1.3Z"/>',
  shield: '<path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-2.5Z"/><path d="m9 12 2 2 4-4"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M15 5.7a3.1 3.1 0 0 1 0 5.8M17 14.5c2 .3 3.3 1.8 3.7 4.5"/>',
  layers: '<path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  sliders: '<path d="M4 7h7M15 7h5M4 17h3M11 17h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrowRight: '<path d="M4 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
  arrowLeft: '<path d="M20 12H5M10 6.5 4.5 12l5.5 5.5"/>',
  chevronDown: '<path d="m6 9.5 6 6 6-6"/>',
  chevronLeft: '<path d="m14.5 5-7 7 7 7"/>',
  chevronRight: '<path d="m9.5 5 7 7-7 7"/>',
  spark: '<path d="M12 3.5c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z" fill="currentColor" stroke="none"/><path d="M19 15.5c.3 2 1.1 2.8 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.2 2.7-1 3-3Z" fill="currentColor" stroke="none"/>',
  sun: '<circle cx="12" cy="12" r="4.1"/><path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>',
  moon: '<path d="M20.2 15.6A8.2 8.2 0 0 1 8.4 3.8 8.6 8.6 0 1 0 20.2 15.6Z"/>',
  film: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M8 5v14M16 5v14M3.5 9h4.5M16 9h4.5M3.5 15h4.5M16 15h4.5"/>',
  energy: '<path d="M13.5 2.5 5 13.5h5.5L10 21.5l9-11.5h-5.5l.5-7.5Z"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5"/>',
  alert: '<path d="M12 4 21 20H3L12 4Z"/><path d="M12 9.5v5M12 17.5h.01"/>',
  info: '<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5M12 7.8h.01"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  more: '<circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M20 5v5h-5"/><path d="M19 10a7.5 7.5 0 1 0 .4 3.4"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8Z"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  video: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 5-3v10l-5-3"/>',
  circlePlus: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  download: '<path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 18.5V20h16v-1.5"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3 3-2.5 4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  home: '<path d="m3.5 10 8.5-6.5L20.5 10v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19v-9Z"/><path d="M9.5 20.5V14h5v6.5"/>',
  ticket: '<path d="M4 8.5V6.5h16v2a2.5 2.5 0 0 0 0 5v2H4v-2a2.5 2.5 0 0 0 0-5Z"/><path d="M9 6.5v11M15 6.5v11" stroke-dasharray="1 3"/>',
}

const icon = computed(() => icons[props.name] ?? icons.info)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <g v-html="icon" />
  </svg>
</template>
