# ShipSmart AI API - Production Dockerfile
# Architecture: Single container with Nginx + Node.js 22 + PM2

FROM nginx:alpine

# Install Node.js 22, npm, and other dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    curl \
    postgresql-client

# Install Corepack and enable Yarn 3.6.1 (specified in package.json)
RUN npm install -g corepack && \
    corepack enable && \
    corepack prepare yarn@3.6.1 --activate

# Install PM2 globally
RUN npm install -g pm2

# Set environment as non-interactive
ENV DEBIAN_FRONTEND=noninteractive

# Create app directory
RUN mkdir -p /root/shipsmart-ai-api
WORKDIR /root/shipsmart-ai-api

# Copy application files
COPY . /root/shipsmart-ai-api

# Make PM2 script executable
RUN chmod +x pm2*.sh || true

# Build arguments (will be set by Jenkins or locally)
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Remove existing yarn.lock and install dependencies
RUN rm -rf yarn.lock
RUN yarn install --frozen-lockfile || yarn install

# Rebuild native modules for the current architecture
RUN yarn rebuild bcrypt msgpackr-extract

# Run database migrations
RUN cd service && yarn db:migrate || echo "Migrations will run on startup"

# Copy Nginx configuration based on environment
# Note: Config files should be pulled from S3 before Docker build (in Jenkins)
# For local development, we'll use a default config
RUN if [ -f nginx/nginx.${NODE_ENV}.conf ]; then \
      cp nginx/nginx.${NODE_ENV}.conf /etc/nginx/nginx.conf; \
    else \
      echo "Nginx config for ${NODE_ENV} not found, using default"; \
    fi

# Create logs directory
RUN mkdir -p ./logs

# Expose ports
# 80: Nginx HTTP
# 443: Nginx HTTPS
# 3000: API (internal, accessed via Nginx)
# 3050: Bull Arena UI (internal)
EXPOSE 80 443 3000 3050

# PM2 as entrypoint (runs Nginx + all Node.js processes: API, worker, arena)
ENTRYPOINT ["/root/shipsmart-ai-api/pm2.sh"]
CMD ["sh", "run"]
