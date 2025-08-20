# Multi-stage build for Expo PWA
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --force; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for Strmify environment variables
ARG EXPO_PUBLIC_TMDB_API_KEY
ARG EXPO_PUBLIC_ENABLE_STREMIO
ARG EXPO_PUBLIC_SHOW_CONTACT
ARG EXPO_PUBLIC_BUY_ME_COFFEE
ARG EXPO_PUBLIC_FEEDBACK_URL
ARG EXPO_PUBLIC_TRAKT_CLIENT_ID
ARG EXPO_PUBLIC_TRAKT_CLIENT_SECRET
ARG EXPO_PUBLIC_TRAKT_REDIRECT_URI
ARG EXPO_PUBLIC_TRAKT_API_BASE

# Set environment variables for build time
ENV EXPO_PUBLIC_TMDB_API_KEY=$EXPO_PUBLIC_TMDB_API_KEY
ENV EXPO_PUBLIC_ENABLE_STREMIO=$EXPO_PUBLIC_ENABLE_STREMIO
ENV EXPO_PUBLIC_SHOW_CONTACT=$EXPO_PUBLIC_SHOW_CONTACT
ENV EXPO_PUBLIC_BUY_ME_COFFEE=$EXPO_PUBLIC_BUY_ME_COFFEE
ENV EXPO_PUBLIC_FEEDBACK_URL=$EXPO_PUBLIC_FEEDBACK_URL
ENV EXPO_PUBLIC_TRAKT_CLIENT_ID=$EXPO_PUBLIC_TRAKT_CLIENT_ID
ENV EXPO_PUBLIC_TRAKT_CLIENT_SECRET=$EXPO_PUBLIC_TRAKT_CLIENT_SECRET
ENV EXPO_PUBLIC_TRAKT_REDIRECT_URI=$EXPO_PUBLIC_TRAKT_REDIRECT_URI
ENV EXPO_PUBLIC_TRAKT_API_BASE=$EXPO_PUBLIC_TRAKT_API_BASE

# Export the web build
RUN npx expo export -p web

# Production image with Node.js server
FROM node:18-alpine AS runner
WORKDIR /app

# Install serve globally for serving static files
RUN npm install -g serve

# Copy static assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 80

# Start server
CMD ["serve", "-s", "dist", "-l", "80"]