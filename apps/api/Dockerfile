FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl \
  && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @tgim/api...
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @tgim/shared build && pnpm --filter @tgim/api prisma:generate && pnpm --filter @tgim/api build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg openssl \
  && addgroup -S tgim \
  && adduser -S tgim -G tgim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=tgim:tgim /app /app
USER tgim
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
