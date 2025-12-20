# Multi-stage build for React frontend
# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build arguments for environment
ARG VITE_API_URL=https://api.applyx.in
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set environment for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build production
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files to nginx html
COPY --from=builder /app/dist /usr/share/nginx/html

# Also copy to a backup location
COPY --from=builder /app/dist /app/dist-backup

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script that copies files to shared volume
RUN echo '#!/bin/sh' > /docker-entrypoint.d/99-copy-files.sh && \
    echo 'cp -r /usr/share/nginx/html/* /app/dist/ 2>/dev/null || true' >> /docker-entrypoint.d/99-copy-files.sh && \
    chmod +x /docker-entrypoint.d/99-copy-files.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
