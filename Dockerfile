# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.14.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl dumb-init \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM deps AS builder
ENV NODE_ENV=production
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
  HOME=/tmp \
  WRANGLER_WRITE_LOGS=false \
  WRANGLER_LOG_PATH=/tmp/wrangler/logs
RUN addgroup --system --gid 1001 first30 \
  && adduser --system --uid 1001 --ingroup first30 --no-create-home first30 \
  && mkdir -p /app/.wrangler \
  && chown -R first30:first30 /app/.wrangler
COPY --from=builder --chown=first30:first30 /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=first30:first30 /app/node_modules ./node_modules
COPY --from=builder --chown=first30:first30 /app/dist ./dist
COPY --from=builder --chown=first30:first30 /app/.openai ./.openai
COPY --from=builder --chown=first30:first30 /app/public ./public
COPY --from=builder --chown=first30:first30 /app/vite.config.ts /app/next.config.ts ./
COPY --chown=first30:first30 --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh
USER first30
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/docker-entrypoint.sh"]
