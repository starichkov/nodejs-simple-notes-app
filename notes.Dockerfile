# syntax=docker/dockerfile:1

# Build stage: install only production dependencies
FROM node:22.20-alpine3.22 AS builder
WORKDIR /app
COPY package*.json ./
# Install reproducible, production-only deps and clean cache
RUN npm ci --only=production && npm cache clean --force

# Runtime stage: minimal image, non-root user
FROM node:22.20-alpine3.22 AS runner
# Install wget for health checks
RUN apk add --no-cache wget
ENV NODE_ENV=production
WORKDIR /app

# Copy only production dependencies from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy the application code to the container (only what's needed to run)
# Include package.json so Node recognizes ESM (type: module)
COPY --chown=node:node package.json ./
COPY --chown=node:node src/notes-api-server.js .
# Include the shared logger module required at runtime
COPY --chown=node:node src/logger.js .
COPY --chown=node:node src/public ./public
COPY --chown=node:node src/db ./db
COPY --chown=node:node src/models ./models
COPY --chown=node:node src/routes ./routes

# Drop privileges to non-root user provided by the Node image
USER node

# Expose the port the Express server will run on
EXPOSE 3000

# Define the command to run the Node.js server
CMD ["node", "notes-api-server.js"]