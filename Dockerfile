# Build Expo web client
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV EXPO_PUBLIC_API_URL=https://rompmusic.com/api/v1
RUN npx expo export --platform web

# Serve static files
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
