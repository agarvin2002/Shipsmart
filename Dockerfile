# ShipSmart AI API - Production Dockerfile
# Architecture: Single container with Nginx + Node.js 22 + PM2

FROM nginx:alpine

# Install Node.js 22, npm, and other dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    curl \
    postgresql-client \
    aws-cli

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

# NODE_ENV defaults to production at build time (optimizes yarn install).
# At runtime, ECS overrides this with the actual environment (staging, demo, etc.)
ENV NODE_ENV=production

# Remove existing yarn.lock and install dependencies
RUN rm -rf yarn.lock
RUN yarn install --frozen-lockfile || yarn install

# Rebuild native modules for the current architecture
RUN yarn rebuild bcrypt msgpackr-extract

# Run database migrations
RUN cd service && yarn db:migrate || echo "Migrations will run on startup"

# Nginx config is selected at container startup in pm2.sh based on runtime NODE_ENV.
# All nginx config files are included in the image for all environments.

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
