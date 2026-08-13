FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @tgim/web...
COPY apps/web apps/web
COPY packages/api-client packages/api-client
COPY packages/shared packages/shared
RUN pnpm --filter @tgim/shared build \
  && pnpm --filter @tgim/api-client build \
  && pnpm --filter @tgim/web build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S tgim && adduser -S tgim -G tgim
COPY --from=build --chown=tgim:tgim /repo/apps/web/.next/standalone ./
COPY --from=build --chown=tgim:tgim /repo/apps/web/.next/static ./apps/web/.next/static
USER tgim
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
