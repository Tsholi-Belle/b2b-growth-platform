# ==============================================================================
# ArchEngine Solutions - Production Dockerfile (All-in-One Service)
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend dependencies definition
COPY backend/package*.json ./backend/

# Install backend production dependencies via lockfile
RUN cd backend && npm ci --omit=dev

# Copy entire application source code
COPY . .

# Expose backend API & web app port
EXPOSE 3001

# Set working directory to backend
WORKDIR /app/backend

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start Node.js Express server
CMD ["node", "server.js"]
