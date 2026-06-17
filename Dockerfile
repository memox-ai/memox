FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript server code
RUN npm run build

# Build Dashboard frontend code
RUN cd dashboard && npm install && npm run build

# Expose REST API port
EXPOSE 16369

# Set environment to production
ENV NODE_ENV=production

# Run CLI command to start the server
CMD ["node", "dist/cli/main.js", "start", "--port", "16369"]
