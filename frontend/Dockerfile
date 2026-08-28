FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfiles first — npm ci layer is cached until package*.json changes
COPY package.json package-lock.json .npmrc ./
RUN npm ci --prefer-offline

# Copy source then build
COPY . .

# Vite bakes these into the JS bundle at build time. Railway passes Service Variables as Docker
# build args, but Docker only receives a build arg if the Dockerfile explicitly declares ARG for
# it -- without this, npm run build never sees VITE_API_URL/VITE_ADMIN_API_URL at all, no matter
# what's set in Railway's dashboard, and publicApi.js/admin.config.js silently fall back to
# relative paths that resolve to nothing in production (no dev-server proxy to rescue them).
# Found 2026-08-28 verifying the real deployed bundle directly -- confirmed via Railway's own docs
# ("Dockerfile Configuration", docs.railway.com/builds/dockerfiles).
ARG VITE_API_URL
ARG VITE_ADMIN_API_URL
RUN npm run build

# ── Serve with nginx ──────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# nginx:alpine auto-processes *.conf.template files in /etc/nginx/templates/
# using envsubst — substitutes $PORT at container startup
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
