FROM node:20-slim

RUN npm install -g pnpm

# Install Playwright system deps upfront
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/web/package.json ./apps/web/
COPY apps/web/client/package.json ./apps/web/client/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Install Playwright Chromium and system deps
RUN pnpm exec playwright install --with-deps chromium

# Build all packages + web app
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

# Remove dev-only files to keep image lean
RUN rm -rf tests flows vibe-out packages/*/src packages/*/tests \
    apps/web/src apps/web/client/src apps/web/client/index.html \
    apps/web/client/vite.config.ts apps/web/client/tsconfig.json \
    packages/*/tsconfig.json apps/web/tsconfig.json \
    *.tsbuildinfo packages/*/tsconfig.tsbuildinfo apps/web/tsconfig.tsbuildinfo \
    apps/fixture-site .eslintrc.cjs .prettierrc

EXPOSE 3000

CMD ["node", "apps/web/dist/server.js"]
