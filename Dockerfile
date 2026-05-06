# ── Stage 1: Builder ──
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# Install Playwright system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libx11-xcb1 libx11-6 fonts-liberation xdg-utils wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests for dependency installation (cached layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy all source
COPY . .

# Install Chromium (cached browser download)
RUN npx playwright install --with-deps chromium

# Build all packages + web app
RUN pnpm build

# ── Stage 2: Runtime ──
FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

# Runtime system deps for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libx11-xcb1 libx11-6 fonts-liberation xdg-utils ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests + install production deps only
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/web/client/dist ./apps/web/client/dist

# Copy Playwright Chromium from builder
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

ENV NODE_ENV=production
ENV PORT=3000
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

EXPOSE 3000

CMD ["node", "apps/web/dist/server.js"]
