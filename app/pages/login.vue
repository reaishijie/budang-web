<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const toast = useToast()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

useSeoMeta({ title: '登录', description: '登录光影，继续未完的放映。' })

const redirectPath = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : '/'
})

async function submit() {
  if (submitting.value) return
  errorMessage.value = ''
  if (!username.value.trim() || !password.value) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  submitting.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    toast.success('欢迎回到光影')
    await router.push(redirectPath.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="auth-showcase">
      <div class="showcase-glow" aria-hidden="true" />
      <div class="showcase-lines" aria-hidden="true" />

      <NuxtLink to="/" class="showcase-brand">
        <AppLogo />
      </NuxtLink>

      <div class="showcase-copy">
        <span class="eyebrow">MEMBERS ONLY · 凭票入场</span>
        <h1 class="showcase-title">
          把光<br>
          <em>留在银幕上。</em>
        </h1>
        <p>
          登录后，你可以收藏喜欢的影片、留下观后感，
          并在获得授权后提交自己的影像。
        </p>
      </div>

      <div class="showcase-reel" aria-hidden="true">
        <div class="reel-frame reel-frame--one">
          <span>01 / NIGHT</span>
        </div>
        <div class="reel-frame reel-frame--two">
          <span>02 / LIGHT</span>
        </div>
        <div class="reel-frame reel-frame--three">
          <span>03 / MEMORY</span>
        </div>
      </div>

      <div class="showcase-foot">
        <span>GUANGYING SCREENING ROOM</span>
        <span>EST. 2026</span>
      </div>
    </section>

    <section class="auth-form-side">
      <div class="auth-topbar">
        <NuxtLink to="/" class="back-home">
          <AppIcon name="arrowLeft" :size="14" />
          返回放映室
        </NuxtLink>
        <span class="topbar-note">NO. 001 · ADMIT ONE</span>
      </div>

      <div class="auth-card">
        <header class="auth-head">
          <span class="section-kicker">WELCOME BACK</span>
          <h2>欢迎回来</h2>
          <p>用你的账户，继续未完的放映。</p>
        </header>

        <form class="auth-form" @submit.prevent="submit">
          <div class="field">
            <label class="field-label" for="login-username">用户名</label>
            <input
              id="login-username"
              v-model="username"
              class="input"
              type="text"
              autocomplete="username"
              placeholder="输入用户名"
              required
            >
          </div>

          <div class="field">
            <label class="field-label" for="login-password">
              密码
              <span class="field-label__hint">区分大小写</span>
            </label>
            <div class="password-wrap">
              <input
                id="login-password"
                v-model="password"
                class="input"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="输入密码"
                required
              >
              <button
                class="password-toggle"
                type="button"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <AppIcon :name="showPassword ? 'eye' : 'lock'" :size="15" />
              </button>
            </div>
          </div>

          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

          <button class="btn btn-primary btn-lg btn-block auth-submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="spinner" />
            <AppIcon v-else name="ticket" :size="16" />
            {{ submitting ? '正在验票…' : '入场' }}
          </button>

          <div class="auth-hint">
            <AppIcon name="info" :size="13" />
            忘记密码？请联系管理员重置。当前版本未开放邮件找回。
          </div>
        </form>

        <footer class="auth-switch">
          <span>还没有账户？</span>
          <NuxtLink :to="{ path: '/register', query: route.query }">创建一张入场券</NuxtLink>
        </footer>
      </div>

      <div class="auth-below">
        <span>© {{ new Date().getFullYear() }} 光影放映室</span>
        <span>BUN · HONO · NUXT</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(440px, 0.92fr);
  min-height: 100vh;
}

.auth-showcase {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(28px, 4vw, 52px);
  border-right: 1px solid var(--line);
  background:
    radial-gradient(circle at 72% 18%, rgba(243, 184, 95, 0.16), transparent 44%),
    radial-gradient(circle at 20% 88%, rgba(224, 107, 128, 0.1), transparent 50%),
    linear-gradient(150deg, #14120e, #08090c 58%);
}
.showcase-glow {
  position: absolute;
  top: -20%;
  right: -10%;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: rgba(243, 184, 95, 0.1);
  filter: blur(90px);
}
.showcase-lines {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(90deg, rgba(243, 239, 228, 0.05) 1px, transparent 1px);
  background-size: calc(100% / 5) 100%;
  mask-image: linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent);
  pointer-events: none;
}

.showcase-brand {
  position: relative;
  z-index: 1;
  width: fit-content;
}

.showcase-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 20px;
  max-width: 560px;
  margin: 44px 0;
}
.showcase-title {
  font-family: var(--font-display);
  font-size: clamp(48px, 6.2vw, 86px);
  font-weight: 400;
  letter-spacing: -0.045em;
  line-height: 0.98;
}
.showcase-title em {
  color: var(--amber);
  font-style: normal;
}
.showcase-copy p {
  max-width: 30em;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.85;
}

.showcase-reel {
  position: absolute;
  right: -40px;
  bottom: 12%;
  z-index: 0;
  display: flex;
  gap: 12px;
  opacity: 0.55;
  transform: rotate(-8deg);
}
.reel-frame {
  width: 120px;
  height: 168px;
  border: 1px solid rgba(243, 239, 228, 0.14);
  border-radius: 10px;
  background: linear-gradient(160deg, rgba(243, 184, 95, 0.1), rgba(8, 9, 12, 0.2));
  backdrop-filter: blur(6px);
}
.reel-frame--one {
  transform: translateY(-26px);
}
.reel-frame--two {
  transform: translateY(18px);
}
.reel-frame--three {
  transform: translateY(-8px);
}
.reel-frame span {
  display: block;
  padding: 12px;
  color: rgba(243, 239, 228, 0.3);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
}

.showcase-foot {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.16em;
}

.auth-form-side {
  display: flex;
  flex-direction: column;
  padding: clamp(26px, 4vw, 46px);
  background:
    radial-gradient(circle at 90% 0%, rgba(243, 184, 95, 0.05), transparent 38%),
    var(--bg);
}
.auth-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.back-home {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 10px;
  transition: color 150ms ease;
}
.back-home:hover {
  color: var(--ink);
}
.topbar-note {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.12em;
}

.auth-card {
  width: min(400px, 100%);
  margin: auto;
  padding: 26px 0;
}

.auth-head {
  display: grid;
  gap: 7px;
  margin-bottom: 28px;
}
.auth-head h2 {
  font-family: var(--font-display);
  font-size: clamp(38px, 4vw, 50px);
  font-weight: 400;
  letter-spacing: -0.035em;
}
.auth-head p {
  color: var(--muted);
  font-size: 12px;
}

.auth-form {
  display: grid;
  gap: 17px;
}
.password-wrap {
  position: relative;
}
.password-wrap .input {
  padding-right: 44px;
}
.password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transform: translateY(-50%);
}
.password-toggle:hover {
  color: var(--ink);
  background: rgba(243, 239, 228, 0.06);
}

.auth-submit {
  margin-top: 4px;
}
.auth-hint {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding-top: 3px;
  color: var(--muted-weak);
  font-size: 10px;
  line-height: 1.6;
}
.auth-hint :deep(svg) {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--muted);
}

.auth-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 10.5px;
}
.auth-switch a {
  color: var(--amber);
  font-weight: 600;
}
.auth-switch a:hover {
  color: var(--amber-bright);
}

.auth-below {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.1em;
}

@media (max-width: 1000px) {
  .auth-page {
    grid-template-columns: 1fr;
  }
  .auth-showcase {
    display: none;
  }
  .auth-form-side {
    min-height: 100vh;
  }
  .auth-card {
    width: min(420px, 100%);
  }
}

@media (max-width: 520px) {
  .topbar-note {
    display: none;
  }
  .auth-form-side {
    padding: 22px;
  }
  .auth-head h2 {
    font-size: 38px;
  }
  .auth-switch {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
