# Multi-stage build for Expo PWA
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with npm ci for faster, reliable builds
RUN npm ci --only=production --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install all dependencies (including dev dependencies) for building
RUN npm ci --force

# Build arguments for Strmify environment variables
ARG EXPO_PUBLIC_TMDB_API_KEY
ARG EXPO_PUBLIC_SHOW_CONTACT
ARG EXPO_PUBLIC_BUY_ME_COFFEE
ARG EXPO_PUBLIC_FEEDBACK_URL
ARG EXPO_PUBLIC_TRAKT_CLIENT_ID
ARG EXPO_PUBLIC_TRAKT_CLIENT_SECRET
ARG EXPO_PUBLIC_TRAKT_REDIRECT_URI
ARG EXPO_PUBLIC_TRAKT_API_BASE

# Set environment variables for build time
ENV EXPO_PUBLIC_TMDB_API_KEY=$EXPO_PUBLIC_TMDB_API_KEY
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