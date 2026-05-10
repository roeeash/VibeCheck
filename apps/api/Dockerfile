# ── Stage 1: Builder ──
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# Install system deps for Playwright's Chromium
RUN npx -y playwright@1.44.0 install-deps chromium

# Copy everything
COPY . .

# Install all dependencies
RUN pnpm install

# Install Playwright Chromium
RUN pnpm --filter @vibecheck/engine exec playwright install chromium

# Build all packages
RUN pnpm build

# Deploy the @vibecheck/api workspace package (includes node_modules with all deps resolved)
RUN pnpm deploy --filter=@vibecheck/api --prod --legacy /app-deps

# ── Stage 2: Runtime ──
FROM node:20-slim

WORKDIR /app

# Copy deployed API + node_modules
COPY --from=builder /app-deps .

# Install system deps for Playwright's Chromium
RUN npx -y playwright@1.44.0 install-deps chromium

# Copy Playwright Chromium binary from builder
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

ENV NODE_ENV=production
ENV PORT=4000
ENV LOG_LEVEL=info
ENV NODE_OPTIONS=--max-old-space-size=128
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/server.js"]
