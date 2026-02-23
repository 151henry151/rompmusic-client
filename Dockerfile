# Build Expo web client
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV EXPO_PUBLIC_API_URL=https://rompmusic.com/api/v1
# Base path so asset URLs use /app/... and reload on /app/... stays on the client (no redirect to website)
ENV EXPO_PUBLIC_WEB_BASE_URL=/app
RUN npx expo export --platform web

# Serve static files with SPA fallback (reload on /app/Library etc. works)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
