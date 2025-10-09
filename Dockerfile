FROM node:20-alpine as frontend-builder

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the frontend application
RUN npm run build

# Backend builder stage
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy backend files
COPY ./Backend/NestJS/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY ./Backend/NestJS .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy backend dependencies
COPY --from=backend-builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy backend built files
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules

# Copy frontend built assets
COPY --from=frontend-builder /app/dist ./frontend

EXPOSE 3000 80

CMD ["node", "dist/main.js"]
