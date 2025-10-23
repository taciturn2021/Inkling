# Use a multi-arch, Debian-based Node 20 image (arm64/amd64 supported)
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Build
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production

# If you use private registries, add .npmrc here before ci
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the Next.js app
RUN npm run build

# Runtime image
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8476

# Don’t bake secrets here; pass them via Coolify environment
# Copy the built app and runtime deps
COPY --from=builder /app ./

# Expose Next.js port
EXPOSE 8476

# Healthcheck (optional)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
#   CMD node -e "require('http').get('http://localhost:8476/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "run", "start"]