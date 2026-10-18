FROM oven/bun:1.3.14-alpine AS build

WORKDIR /app

# nuxt.config.ts / tsconfig.json 需在 install 前就位，postinstall 的 nuxt prepare 依赖它们
COPY package.json bun.lock nuxt.config.ts tsconfig.json ./
RUN bun install --frozen-lockfile

COPY app ./app
COPY server ./server
COPY public ./public

RUN bun run build

FROM oven/bun:1.3.14-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --from=build --chown=bun:bun /app/package.json ./

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", ".output/server/index.mjs"]
