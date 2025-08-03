# Build stage
FROM node:20-bullseye AS builder
WORKDIR /app

# Cache deps first
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps && npm cache clean --force

# Copy rest of the app
COPY . .

# Env vars for Expo
ARG EXPO_PUBLIC_TMDB_API_KEY
ARG EXPO_PUBLIC_SHOW_CONTACT
ARG EXPO_PUBLIC_BUY_ME_COFFEE
ARG EXPO_PUBLIC_FEEDBACK_URL

ENV EXPO_PUBLIC_TMDB_API_KEY=$EXPO_PUBLIC_TMDB_API_KEY
ENV EXPO_PUBLIC_SHOW_CONTACT=$EXPO_PUBLIC_SHOW_CONTACT
ENV EXPO_PUBLIC_BUY_ME_COFFEE=$EXPO_PUBLIC_BUY_ME_COFFEE
ENV EXPO_PUBLIC_FEEDBACK_URL=$EXPO_PUBLIC_FEEDBACK_URL

# Build static site
RUN npx expo export -p web

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
