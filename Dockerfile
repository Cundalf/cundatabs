# Use Bun image
FROM oven/bun:1 as base

# Set working directory
WORKDIR /app

# Copy package.json and bun.lock (if exists)
COPY package.json ./
COPY bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code and static assets
COPY src ./src
COPY public ./public
COPY static ./static
COPY tsconfig.json ./

# Create tablaturas directory with proper permissions
RUN mkdir -p /app/tablaturas && chmod 755 /app/tablaturas

# Build the application
RUN bun run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun run -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "dist/server.js"]