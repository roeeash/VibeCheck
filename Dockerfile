# ── Stage 1: Builder ──
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# Install system deps for Playwright's Chromium — Playwright knows exactly what it needs
RUN npx -y playwright@1.44.0 install-deps chromium

# Copy everything
COPY . .

# Install all dependencies
RUN pnpm install

# Install Playwright Chromium
RUN pnpm --filter @vibecheck/engine exec playwright install chromium

# Build all packages + web app
RUN pnpm build

# Deploy the @vibecheck/web workspace package (includes its node_modules with all deps resolved)
RUN rm -rf vibe-out && pnpm deploy --filter=@vibecheck/web --prod --legacy /prod-deps

# ── Stage 2: Runtime ──
FROM node:20-slim

WORKDIR /app

# Copy deployed web app — node_modules, dist, client/dist
COPY --from=builder /prod-deps .

# Install system deps for Playwright's Chromium — future-proof, no manual apt list
RUN npx -y playwright@1.44.0 install-deps chromium

# Copy Playwright Chromium binary from builder
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS=--max-old-space-size=128
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

EXPOSE 3000

CMD ["node", "dist/server.js"]
