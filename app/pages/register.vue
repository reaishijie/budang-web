<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const toast = useToast()

const form = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  confirm: '',
})
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

useSeoMeta({ title: '注册', description: '创建光影账户，收藏影片并参与讨论。' })

const redirectPath = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : '/'
})

async function submit() {
  if (submitting.value) return
  errorMessage.value = ''

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.username.trim())) {
    errorMessage.value = '用户名需为 3–30 位字母、数字、下划线或连字符'
    return
  }
  if (form.password.length < 6) {
    errorMessage.value = '密码至少需要 6 位'
    return
  }
  if (form.password !== form.confirm) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errorMessage.value = '邮箱格式不正确'
    return
  }

  submitting.value = true
  try {
    await auth.register({
      username: form.username.trim(),
      password: form.password,
      nickname: form.nickname.trim() || undefined,
      email: form.email.trim() || undefined,
    })
    await auth.login(form.username.trim(), form.password)
    toast.success('入场券已生效，欢迎来到光影')
    await router.push(redirectPath.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '注册失败，请稍后重试'
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
        <span class="eyebrow">NEW MEMBER · 领取入场券</span>
        <h1 class="showcase-title">
          你的座位，<br>
          <em>已经留好。</em>
        </h1>
        <p>
          创建账户后即可收藏影片、参与讨论、记录观看进度。
          上传权限由管理员单独开通。
        </p>
      </div>

      <div class="ticket" aria-hidden="true">
        <div class="ticket-head">
          <span>ADMIT ONE</span>
          <span>NO. 2026</span>
        </div>
        <div class="ticket-body">
          <strong>光影放映室</strong>
          <span>GUANGYING SCREENING ROOM</span>
        </div>
        <div class="ticket-dash" />
        <div class="ticket-foot">
          <span>EDITION 01</span>
          <span>KEEP THIS TICKET</span>
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
        <span class="topbar-note">MEMBER REGISTRATION</span>
      </div>

      <div class="auth-card">
        <header class="auth-head">
          <span class="section-kicker">JOIN THE AUDIENCE</span>
          <h2>领取入场券</h2>
          <p>花一分钟，给自己留一个座位。</p>
        </header>

        <form class="auth-form" @submit.prevent="submit">
          <div class="form-row">
            <div class="field">
              <label class="field-label" for="register-username">用户名 <span class="required">*</span></label>
              <input
                id="register-username"
                v-model="form.username"
                class="input"
                type="text"
                autocomplete="username"
                placeholder="3–30 位字母或数字"
                required
              >
            </div>
            <div class="field">
              <label class="field-label" for="register-nickname">昵称</label>
              <input
                id="register-nickname"
                v-model="form.nickname"
                class="input"
                type="text"
                autocomplete="nickname"
                placeholder="银幕上显示的名字"
              >
            </div>
          </div>

          <div class="field">
            <label class="field-label" for="register-email">
              邮箱
              <span class="field-label__hint">可选，用于未来找回密码</span>
            </label>
            <input
              id="register-email"
              v-model="form.email"
              class="input"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
            >
          </div>

          <div class="field">
            <label class="field-label" for="register-password">密码 <span class="required">*</span></label>
            <div class="password-wrap">
              <input
                id="register-password"
                v-model="form.password"
                class="input"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="至少 6 位"
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

          <div class="field">
            <label class="field-label" for="register-confirm">确认密码 <span class="required">*</span></label>
            <input
              id="register-confirm"
              v-model="form.confirm"
              class="input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="再输入一次"
              required
            >
          </div>

          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

          <button class="btn btn-primary btn-lg btn-block auth-submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="spinner" />
            <AppIcon v-else name="ticket" :size="16" />
            {{ submitting ? '正在制作入场券…' : '创建账户' }}
          </button>

          <p class="register-note">
            注册即表示你愿意遵守放映室的秩序：尊重创作者，友善讨论。上传影片需管理员单独授权。
          </p>
        </form>

        <footer class="auth-switch">
          <span>已经有账户？</span>
          <NuxtLink :to="{ path: '/login', query: route.query }">直接入场</NuxtLink>
        </footer>
      </div>

      <div class="auth-below">
        <span>© {{ new Date().getFullYear() }} 光影放映室</span>
        <span>NO ALGORITHM · JUST GOOD FILMS</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(460px, 0.98fr);
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
    radial-gradient(circle at 74% 16%, rgba(243, 184, 95, 0.15), transparent 44%),
    radial-gradient(circle at 18% 86%, rgba(139, 180, 255, 0.08), transparent 50%),
    linear-gradient(150deg, #14120e, #08090c 58%);
}
.showcase-glow {
  position: absolute;
  top: -18%;
  right: -8%;
  width: 68%;
  height: 68%;
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
  margin: 38px 0;
}
.showcase-title {
  font-family: var(--font-display);
  font-size: clamp(46px, 5.8vw, 80px);
  font-weight: 400;
  letter-spacing: -0.045em;
  line-height: 0.99;
}
.showcase-title em {
  color: var(--amber);
  font-style: normal;
}
.showcase-copy p {
  max-width: 30em;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.85;
}

.ticket {
  position: relative;
  z-index: 1;
  width: min(310px, 82%);
  margin-bottom: 22px;
  padding: 18px;
  border: 1px solid rgba(243, 184, 95, 0.28);
  border-radius: 12px;
  background:
    radial-gradient(circle at 10% 0%, rgba(243, 184, 95, 0.15), transparent 50%),
    rgba(18, 17, 13, 0.55);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  transform: rotate(-2.5deg);
  backdrop-filter: blur(10px);
}
.ticket-head,
.ticket-foot {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
}
.ticket-body {
  display: grid;
  gap: 5px;
  padding: 24px 0;
}
.ticket-body strong {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: 0.06em;
}
.ticket-body span {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.16em;
}
.ticket-dash {
  height: 1px;
  margin: 0 -18px;
  background-image: linear-gradient(90deg, var(--line-strong) 50%, transparent 50%);
  background-size: 8px 1px;
}
.ticket-foot {
  padding-top: 15px;
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
  width: min(440px, 100%);
  margin: auto;
  padding: 22px 0;
}
.auth-head {
  display: grid;
  gap: 7px;
  margin-bottom: 24px;
}
.auth-head h2 {
  font-family: var(--font-display);
  font-size: clamp(38px, 4vw, 48px);
  font-weight: 400;
  letter-spacing: -0.035em;
}
.auth-head p {
  color: var(--muted);
  font-size: 12px;
}
.auth-form {
  display: grid;
  gap: 15px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.required {
  color: var(--amber);
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
  margin-top: 3px;
}
.register-note {
  color: var(--muted-weak);
  font-size: 9.5px;
  line-height: 1.65;
}
.auth-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 22px;
  padding-top: 18px;
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
}

@media (max-width: 520px) {
  .topbar-note {
    display: none;
  }
  .auth-form-side {
    padding: 22px;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .auth-switch {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
