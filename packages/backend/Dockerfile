# ---- Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies for the build)
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy source code
COPY . .

# Build the application
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm run build; \
    elif [ -f yarn.lock ]; then \
      yarn build; \
    else \
      npm run build; \
    fi

# Prune dev dependencies after build
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm prune --prod; \
    elif [ -f yarn.lock ]; then \
      yarn install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm prune --omit=dev; \
    fi

# ---- Production Stage ----
FROM node:20-alpine AS production

# Add labels for metadata
LABEL maintainer="FlowForge Team"
LABEL description="FlowForge Backend Service"

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Create a non-root user and group
RUN addgroup -g 1001 -S flowforge && \
    adduser -S flowforge -u 1001 -G flowforge

# Copy built artifacts and production dependencies from builder
COPY --from=builder --chown=flowforge:flowforge /app/dist ./dist
COPY --from=builder --chown=flowforge:flowforge /app/node_modules ./node_modules
COPY --from=builder --chown=flowforge:flowforge /app/package.json ./package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Switch to non-root user
USER flowforge

# Expose the application port
EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
