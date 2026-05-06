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

# Copy everything
COPY . .

# Install all dependencies
RUN pnpm install

# Install Playwright Chromium (from engine package where playwright is a direct dep)
RUN pnpm --filter @vibecheck/engine exec playwright install chromium

# Build all packages + web app
RUN pnpm build

# Deploy the @vibecheck/web workspace package (includes its node_modules with all deps resolved)
RUN rm -rf vibe-out && pnpm deploy --filter=@vibecheck/web --prod --legacy /prod-deps

# ── Stage 2: Runtime ──
FROM node:20-slim

WORKDIR /app

# Runtime system deps for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libx11-xcb1 libx11-6 fonts-liberation xdg-utils ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy deployed web app (node_modules + dist + client/dist)
COPY --from=builder /prod-deps .

# Copy Playwright Chromium from builder
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

ENV NODE_ENV=production
ENV PORT=3000
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

EXPOSE 3000

CMD ["node", "dist/server.js"]
