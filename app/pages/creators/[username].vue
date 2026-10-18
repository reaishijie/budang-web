<script setup lang="ts">
import { computed } from 'vue'
import type { PublicUserProfile, Video } from '~/types'
import { formatCount, formatDate } from '~/utils/format'

const route = useRoute()
const videoApi = useVideoApi()
const username = computed(() => String(route.params.username || ''))

const { data, error } = await useAsyncData(
  () => `creator-${username.value}`,
  async () => {
    const profile = await videoApi.getPublicUser(username.value)
    const videos = await videoApi.listVideos({ page: 1, pageSize: 12, uploaderId: profile.id, sort: 'latest' })
    return { profile, videos: videos.items, total: videos.total }
  },
  { watch: [username] },
)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到这位放映者' })
}

const profile = computed(() => data.value?.profile as PublicUserProfile)
const videos = computed(() => data.value?.videos ?? [] as Video[])
const total = computed(() => data.value?.total ?? 0)

useSeoMeta({
  title: () => `${profile.value.nickname || profile.value.username} 的放映页`,
  description: () => `${profile.value.nickname || profile.value.username} 在光影发布的影片。`,
})
</script>

<template>
  <div class="page creator-page">
    <div class="container">
      <header class="creator-head">
        <div class="creator-identity">
          <UserAvatar
            :name="profile.nickname"
            :username="profile.username"
            :avatar="profile.avatar"
            :size="96"
            ring
          />
          <div class="creator-info">
            <span class="eyebrow">SCREENED BY · 放映者</span>
            <h1>{{ profile.nickname || profile.username }}</h1>
            <span class="creator-handle">@{{ profile.username }} · 入席于 {{ formatDate(profile.createdAt) }}</span>
          </div>
        </div>
        <div class="creator-stats">
          <div><strong>{{ profile.stats.publishedVideos }}</strong><span>公开影片</span></div>
          <div><strong>{{ formatCount(profile.stats.comments) }}</strong><span>留言</span></div>
        </div>
      </header>

      <div class="creator-rule">
        <span>FILMOGRAPHY</span>
        <span>{{ total }} 部作品在架</span>
      </div>

      <VideoGrid v-if="videos.length" :videos="videos" />
      <EmptyState
        v-else
        icon="film"
        title="这位放映者还没有公开影片"
        text="等到下一束光亮起，再来看看。"
      >
        <NuxtLink class="btn btn-ghost btn-sm" to="/videos">去片库看看</NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.creator-page {
  padding-top: clamp(34px, 4.5vw, 60px);
}
.creator-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--line);
}
.creator-identity {
  display: flex;
  align-items: center;
  gap: 22px;
}
.creator-info {
  display: grid;
  gap: 8px;
}
.creator-info h1 {
  font-family: var(--font-display);
  font-size: clamp(42px, 5.5vw, 70px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
}
.creator-handle {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
}
.creator-stats {
  display: flex;
  flex: 0 0 auto;
  gap: 34px;
  padding-bottom: 6px;
}
.creator-stats div {
  display: grid;
  justify-items: end;
  gap: 1px;
}
.creator-stats strong {
  color: var(--amber);
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 400;
  line-height: 1;
}
.creator-stats span {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
}
.creator-rule {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 17px 0 26px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}

@media (max-width: 760px) {
  .creator-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 22px;
  }
  .creator-stats {
    justify-content: flex-start;
    gap: 40px;
    padding-bottom: 0;
  }
  .creator-stats div {
    justify-items: start;
  }
}
@media (max-width: 520px) {
  .creator-identity {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
}
</style>
