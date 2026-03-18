FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat tzdata
ENV TZ=Asia/Shanghai

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# better-sqlite3 requires python3, make and g++ to build
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install python3/make/g++ again? No, better-sqlite3 binary matches the arch/os from builder usually if same base.
# But sometimes better-sqlite3 needs specific runtime libs. 
# Let's ensure we copy the node_modules from builder which has the compiled binary.
# NOTE: If we use a different base OS for runner, we might need to rebuild. 
# Here we use node:18-alpine for all stages, so it should be fine.
# HOWEVER, better-sqlite3 might link to system libs.

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the database file if it exists, but usually we want to mount it.
# We will create an empty file just to set permissions, or rely on volume.
# For better-sqlite3, the directory needs to be writable.
# source code copies printers.db if not exists? No, code uses process.cwd()/printers.db
# Let's ensure the User can write to /app
RUN chown nextjs:nodejs /app

# Ensure the data directory exists (must be before USER directive)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV DB_PATH=/app/data/printers.db

# Volume for persistence
VOLUME ["/app/data"]

CMD ["node", "server.js"]
