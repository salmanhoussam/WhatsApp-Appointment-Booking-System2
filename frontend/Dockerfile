FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfiles first — npm ci layer is cached until package*.json changes
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source then build
COPY . .
RUN npm run build

# ── Serve with nginx ──────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
