/**
 * 可选 Demo 数据：通过后端公开 API 创建一组影片、创作者、观众和互动数据。
 *
 * 先启动后端，再运行：
 *   bun run seed:demo
 *
 * 仅在片库为空时执行，避免重复写入。可用环境变量覆盖：
 *   DEMO_API_BASE=http://127.0.0.1:3000
 *   SEED_ADMIN_USERNAME=admin
 *   SEED_ADMIN_PASSWORD=Admin123456
 *   DEMO_PASSWORD=Demo123456
 */

type Envelope<T> = { success: boolean; code: number; message: string; data: T; errorCode?: string }
type Tokens = { accessToken: string; refreshToken: string }
type User = { id: number; username: string; nickname: string | null }

const API = (process.env.DEMO_API_BASE ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123456'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo123456'

const covers = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=1600&q=80',
]

const videoSources = [
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
]

async function request<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  let payload: Envelope<T>
  try {
    payload = await response.json() as Envelope<T>
  } catch {
    throw new Error(`${options.method ?? 'GET'} ${path} 返回了非 JSON 响应（${response.status}）`)
  }
  if (!payload.success) {
    const error = new Error(payload.message || `请求失败（${response.status}）`)
    ;(error as Error & { status?: number; errorCode?: string }).status = response.status
    ;(error as Error & { status?: number; errorCode?: string }).errorCode = payload.errorCode
    throw error
  }
  return payload.data
}

async function login(username: string, password: string) {
  return request<{ user: User; tokens: Tokens }>('/api/auth/login', {
    method: 'POST',
    body: { username, password, clientType: 'demo-seed' },
  })
}

async function ensureDemoUser(username: string, nickname: string) {
  try {
    await request('/api/auth/register', {
      method: 'POST',
      body: { username, nickname, password: DEMO_PASSWORD },
    })
  } catch (error) {
    const status = (error as Error & { status?: number }).status
    if (status !== 409) throw error
  }
  return login(username, DEMO_PASSWORD)
}

interface SeedVideo {
  title: string
  description: string
  coverIndex: number
  sourceIndex: number
  duration: number
  category: string
  tags: string[]
  comments: string[]
  views: number
}

const seedVideos: SeedVideo[] = [
  {
    title: '雾中列车',
    description: '一列没有终点的夜车，载着几个不愿醒来的人。窗外的城市在雨里融化，而车厢里只剩下呼吸和旧唱片的声音。',
    coverIndex: 0,
    sourceIndex: 0,
    duration: 148,
    category: '电影',
    tags: ['城市', '夜晚', '胶片'],
    comments: ['像做了一场很慢的梦。', '最后那个长镜头真好。', '雨声和铁轨声叠在一起的时候，突然想家了。'],
    views: 86,
  },
  {
    title: '海边的放映机',
    description: '一位老放映员把银幕搬到海边。潮水涨落之间，他给一群偶然路过的人放了一部关于远方的电影。',
    coverIndex: 1,
    sourceIndex: 1,
    duration: 96,
    category: '纪录',
    tags: ['自然', '人物', '旅行'],
    comments: ['纪录片也可以这么浪漫。', '海风好像从屏幕里吹出来了。'],
    views: 63,
  },
  {
    title: '夜航西飞',
    description: '从一座城市飞向另一座城市。舷窗外的云层像未剪完的胶片，所有告别都被留在跑道尽头。',
    coverIndex: 2,
    sourceIndex: 2,
    duration: 74,
    category: '纪录',
    tags: ['旅行', '夜晚'],
    comments: ['适合在深夜一个人看。', '舷窗那段太美了。'],
    views: 51,
  },
  {
    title: '失重时刻',
    description: '一段关于漂浮、坠落和重新落地的实验影像。没有对白，只有身体与空间缓慢对话。',
    coverIndex: 3,
    sourceIndex: 0,
    duration: 61,
    category: '实验影像',
    tags: ['黑白', '科幻'],
    comments: ['看不懂，但很喜欢。', '身体在画面里像一封信。'],
    views: 44,
  },
  {
    title: '霓虹之下',
    description: '凌晨两点的 livehouse，最后一首歌结束后，城市还亮着。镜头跟着鼓手走出后门，走进一场没有结束的夜。',
    coverIndex: 4,
    sourceIndex: 2,
    duration: 133,
    category: '音乐',
    tags: ['现场', '城市', '夜晚'],
    comments: ['想立刻去听一场现场。', '鼓点停下来的那几秒最动人。'],
    views: 118,
  },
  {
    title: '最后的胶片',
    description: '冲洗店关门前，老师傅处理完最后一批胶卷。那些被时代留下的颗粒，是他和一座城市共同的记忆。',
    coverIndex: 5,
    sourceIndex: 1,
    duration: 87,
    category: '纪录',
    tags: ['胶片', '人物', '城市'],
    comments: ['想把我柜子里的胶卷拿去洗了。', '胶片是一种很温柔的等待。'],
    views: 57,
  },
  {
    title: '静默频率',
    description: '如果语言消失，我们还能不能听见彼此？一部在废弃电台里拍摄的科幻短片。',
    coverIndex: 6,
    sourceIndex: 0,
    duration: 105,
    category: '实验影像',
    tags: ['科幻', '黑白', '声音'],
    comments: ['声音设计太强了。', '看第二遍才明白结尾。'],
    views: 39,
  },
  {
    title: '山谷来信',
    description: '一对多年未见的朋友在山里重逢。他们沿溪流走了很久，直到把没说完的话都交给风。',
    coverIndex: 7,
    sourceIndex: 2,
    duration: 112,
    category: '电影',
    tags: ['自然', '人物'],
    comments: ['安静得让人想哭。', '山里的光很诚实。'],
    views: 72,
  },
  {
    title: '午夜电台',
    description: '一档没有听众的深夜节目，一个不愿下班的 DJ，和一首被点了无数次的歌。',
    coverIndex: 8,
    sourceIndex: 1,
    duration: 58,
    category: '音乐',
    tags: ['夜晚', '城市', '声音'],
    comments: ['我的深夜背景音。', '那首歌叫什么名字？'],
    views: 94,
  },
  {
    title: '远方来客',
    description: '一个陌生人在小镇停留了三天。他每天坐在同一张长椅上，看同一班车离开，直到有人愿意听他讲完故事。',
    coverIndex: 9,
    sourceIndex: 0,
    duration: 156,
    category: '剧集',
    tags: ['人物', '旅行'],
    comments: ['很克制的叙事，喜欢。', '结尾留给观众的空白刚刚好。'],
    views: 68,
  },
  {
    title: '潮汐之间',
    description: '跟着潮水退去的方向，记录一片滩涂上的十二个小时。没有旁白，只有光在慢慢改变。',
    coverIndex: 10,
    sourceIndex: 2,
    duration: 49,
    category: '纪录',
    tags: ['自然', '旅行'],
    comments: ['看完心很静。', '海边的色彩层次好丰富。'],
    views: 47,
  },
  {
    title: '一间自己的房间',
    description: '三位创作者聊了聊他们工作的地方：一张桌子、一扇窗，和那些必须独自面对的空白。',
    coverIndex: 11,
    sourceIndex: 1,
    duration: 79,
    category: '知识',
    tags: ['人物', '城市', '胶片'],
    comments: ['对我很有启发。', '原来创作空间可以这么小。'],
    views: 35,
  },
]

const creatorVideos = [
  {
    title: '未完成的夏天',
    description: '一场没有拍完的夏天。蝉鸣、泳池、午后短暂的停电，都被留在了一卷过期的胶片里。',
    coverIndex: 10,
    sourceIndex: 0,
    duration: 64,
    category: '电影',
    tags: ['自然', '胶片'],
    action: 'PENDING' as const,
  },
  {
    title: '城市失眠指南',
    description: '给凌晨三点还醒着的人。关于便利店、最后一班地铁和一条总也走不完的街。',
    coverIndex: 2,
    sourceIndex: 2,
    duration: 82,
    category: '纪录',
    tags: ['城市', '夜晚'],
    action: 'PUBLISH' as const,
  },
  {
    title: '手写信',
    description: '一封没有寄出的信，和一段被折叠起来的声音。',
    coverIndex: 5,
    sourceIndex: 1,
    duration: 41,
    category: '实验影像',
    tags: ['黑白', '胶片'],
    action: 'REJECT' as const,
  },
]

async function main() {
  console.log(`\n🎞  光影 Demo 数据 → ${API}\n`)

  const existing = await request<{ total: number }>('/api/videos?pageSize=1')
  if (existing.total > 0) {
    console.log('片库已有影片，Demo seed 跳过。若要重建，请先清空数据库。')
    return
  }

  const admin = await login(ADMIN_USERNAME, ADMIN_PASSWORD)
  const adminToken = admin.tokens.accessToken
  console.log(`✓ 管理员登录：${admin.user.username}`)

  const categoryNames = ['电影', '纪录', '音乐', '剧集', '实验影像', '知识']
  const categories = new Map<string, number>()
  const categoryList = await request<{ items: Array<{ id: number; name: string }> }>('/api/categories?pageSize=100')
  for (const name of categoryNames) {
    const existingCategory = categoryList.items.find(item => item.name === name)
    if (existingCategory) {
      categories.set(name, existingCategory.id)
      continue
    }
    const category = await request<{ id: number }>('/api/categories', {
      method: 'POST',
      token: adminToken,
      body: { name, description: `${name}放映单元`, sortOrder: categoryNames.indexOf(name) },
    })
    categories.set(name, category.id)
  }
  console.log(`✓ 分类：${categoryNames.join(' / ')}`)

  const tagNames = ['城市', '夜晚', '胶片', '自然', '人物', '旅行', '黑白', '科幻', '现场', '声音']
  const tags = new Map<string, number>()
  const tagList = await request<{ items: Array<{ id: number; name: string }> }>('/api/tags?pageSize=100')
  for (const name of tagNames) {
    const existingTag = tagList.items.find(item => item.name === name)
    if (existingTag) {
      tags.set(name, existingTag.id)
      continue
    }
    const tag = await request<{ id: number }>('/api/tags', {
      method: 'POST',
      token: adminToken,
      body: { name },
    })
    tags.set(name, tag.id)
  }
  console.log(`✓ 标签：${tagNames.map(name => `#${name}`).join(' ')}`)

  const viewer1 = await ensureDemoUser('demo_viewer', '夜航观众')
  const viewer2 = await ensureDemoUser('demo_viewer2', '散场以后')
  const creator = await ensureDemoUser('demo_creator', '海边放映员')
  const curator1 = await ensureDemoUser('demo_curator1', '夜航导演')
  const curator2 = await ensureDemoUser('demo_curator2', '霓虹剪辑师')

  for (const account of [creator, curator1, curator2]) {
    await request(`/api/users/${account.user.username}/upload-permission`, {
      method: 'PATCH',
      token: adminToken,
      body: { canUpload: true },
    })
  }

  const energySeed: Array<[string, number, string]> = [
    [creator.user.username, 320, '创作者启动能量'],
    [curator1.user.username, 180, '创作者启动能量'],
    [curator2.user.username, 120, '创作者启动能量'],
    [viewer1.user.username, 80, '观众见面礼'],
    [viewer2.user.username, 50, '观众见面礼'],
  ]
  for (const [username, amount, note] of energySeed) {
    await request('/api/energy/adjust', {
      method: 'POST',
      token: adminToken,
      body: { username, amount, note },
    }).catch(() => undefined)
  }
  console.log('✓ Demo 账户：2 位创作者 / 1 位投稿作者 / 2 位观众（含能量流水）')

  const curators = [curator1, curator2]
  const createdPublished: number[] = []
  for (const [index, video] of seedVideos.entries()) {
    const author = curators[index % curators.length]!
    const created = await request<{ id: number }>('/api/videos', {
      method: 'POST',
      token: author.tokens.accessToken,
      body: {
        title: video.title,
        description: video.description,
        videoUrl: videoSources[video.sourceIndex],
        coverUrl: covers[video.coverIndex],
        duration: video.duration,
        categoryId: categories.get(video.category),
        tagIds: video.tags.map(tag => tags.get(tag)).filter(Boolean),
      },
    })
    await request(`/api/videos/${created.id}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'PUBLISHED' },
    })
    createdPublished.push(created.id)
    if ((index + 1) % 4 === 0) console.log(`  · 已创建并发布 ${index + 1}/${seedVideos.length} 部影片`)
  }

  const creatorIds: Array<{ id: number; action: 'PENDING' | 'PUBLISH' | 'REJECT' }> = []
  for (const video of creatorVideos) {
    const created = await request<{ id: number }>('/api/videos', {
      method: 'POST',
      token: creator.tokens.accessToken,
      body: {
        title: video.title,
        description: video.description,
        videoUrl: videoSources[video.sourceIndex],
        coverUrl: covers[video.coverIndex],
        duration: video.duration,
        categoryId: categories.get(video.category),
        tagIds: video.tags.map(tag => tags.get(tag)).filter(Boolean),
      },
    })
    creatorIds.push({ id: created.id, action: video.action })
  }

  for (const item of creatorIds) {
    if (item.action === 'PUBLISH') {
      await request(`/api/videos/${item.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'PUBLISHED' },
      })
    } else if (item.action === 'REJECT') {
      await request(`/api/videos/${item.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'REJECTED', rejectReason: '封面与影片内容不符，请更换封面后重新提交。' },
      })
    }
  }
  console.log(`✓ 发布 ${createdPublished.length} 部主片单，创作者提交 ${creatorIds.length} 部（1 发布 / 1 驳回 / 1 待审）`)

  const allPublished = [...createdPublished, ...creatorIds.filter(item => item.action === 'PUBLISH').map(item => item.id)]
  const viewerTokens = [viewer1.tokens.accessToken, viewer2.tokens.accessToken]
  const viewerUsernames = [viewer1.user.username, viewer2.user.username]

  for (const [index, video] of seedVideos.entries()) {
    const videoId = createdPublished[index]!
    const commentTexts = video.comments

    for (const [viewerIndex, token] of viewerTokens.entries()) {
      const vote = index % 5 === 0 && viewerIndex === 1 ? 'DISLIKE' : 'LIKE'
      await request(`/api/videos/${videoId}/vote`, {
        method: 'PUT',
        token,
        body: { vote },
      }).catch(() => undefined)

      if (index % 3 === 0 || viewerIndex === 0) {
        await request(`/api/videos/${videoId}/favorite`, {
          method: 'PUT',
          token,
          body: { favorited: index % 4 !== 3 },
        }).catch(() => undefined)
      }
    }

    const comments: number[] = []
    for (const [commentIndex, text] of commentTexts.entries()) {
      const token = viewerTokens[commentIndex % viewerTokens.length]!
      const comment = await request<{ id: number }>(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        token,
        body: { content: text },
      }).catch(() => null)
      if (comment) comments.push(comment.id)
    }
    if (comments[0]) {
      await request(`/api/videos/${videoId}/comments/${comments[0]}/vote`, {
        method: 'PUT',
        token: viewerTokens[1]!,
        body: { vote: 'LIKE' },
      }).catch(() => undefined)
    }

    const viewCount = video.views + index * 3
    for (let batch = 0; batch < viewCount; batch += 10) {
      const requests = Array.from({ length: Math.min(10, viewCount - batch) }, (_, offset) => {
        const token = viewerTokens[(batch + offset) % viewerTokens.length]!
        return request(`/api/videos/${videoId}/view`, {
          method: 'POST',
          token,
          body: { progressSeconds: 0, durationSeconds: video.duration },
        }).catch(() => undefined)
      })
      await Promise.all(requests)
    }

    // 给观众留下真实可继续的进度
    const ratios = [0.28, 0.62, 0.45, 0.8, 0.12, 0.55, 0.37, 0.72, 0.93, 0.41, 0.66, 0.19]
    const ratio = ratios[index % ratios.length]!
    await request(`/api/videos/${videoId}/progress`, {
      method: 'PUT',
      token: viewerTokens[0]!,
      body: {
        progressSeconds: Math.round(video.duration * ratio),
        durationSeconds: video.duration,
      },
    }).catch(() => undefined)
  }

  const creatorPublishedId = creatorIds.find(item => item.action === 'PUBLISH')?.id
  if (creatorPublishedId) {
    const comment = await request<{ id: number }>(`/api/videos/${creatorPublishedId}/comments`, {
      method: 'POST',
      token: viewer2.tokens.accessToken,
      body: { content: '凌晨三点看完，决定出门走一走。' },
    }).catch(() => null)
    if (comment) {
      await request(`/api/videos/${creatorPublishedId}/comments/${comment.id}/vote`, {
        method: 'PUT',
        token: viewer1.tokens.accessToken,
        body: { vote: 'LIKE' },
      }).catch(() => undefined)
    }
    for (let batch = 0; batch < 42; batch += 10) {
      await Promise.all(Array.from({ length: Math.min(10, 42 - batch) }, (_, offset) =>
        request(`/api/videos/${creatorPublishedId}/view`, {
          method: 'POST',
          token: (batch + offset) % 2 === 0 ? viewer1.tokens.accessToken : viewer2.tokens.accessToken,
          body: { progressSeconds: 0, durationSeconds: 82 },
        }).catch(() => undefined),
      ))
    }
  }

  for (const videoId of creatorIds.map(item => item.id)) {
    await request(`/api/videos/${videoId}/vote`, {
      method: 'PUT',
      token: viewer1.tokens.accessToken,
      body: { vote: 'LIKE' },
    }).catch(() => undefined)
  }

  console.log(`✓ 为 ${allPublished.length} 部影片写入观看、点赞、收藏与评论`)
  console.log('\n🎬 Demo 数据准备完成')
  console.log(`   前台：http://localhost:5173`)
  console.log(`   管理员：${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`)
  console.log(`   Demo 创作者：demo_creator / ${DEMO_PASSWORD}`)
  console.log(`   Demo 观众：demo_viewer / ${DEMO_PASSWORD}\n`)
}

main().catch((error) => {
  console.error('\nDemo seed 失败：', error instanceof Error ? error.message : error)
  process.exit(1)
})

export {}
