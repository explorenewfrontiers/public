FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY dist ./dist

# Expose port
EXPOSE 8000

# Start server
ENV PORT=8000
CMD ["node", "dist/index.js"]
