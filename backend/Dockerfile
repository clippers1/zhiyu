FROM node:22-bookworm-slim AS dependencies
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /workspace/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

FROM node:22-bookworm-slim AS builder
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /workspace/backend
COPY --from=dependencies /workspace/backend/node_modules ./node_modules
COPY backend/ .
COPY src/ /workspace/src/
COPY public/favicon.svg /workspace/public/favicon.svg
COPY public/content/ /workspace/backend/public/content/
RUN PAYLOAD_SECRET=build-placeholder-not-a-runtime-secret npm run build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3108
WORKDIR /workspace/backend
COPY --from=builder --chown=node:node /workspace/backend/.next/standalone ./
COPY --from=builder --chown=node:node /workspace/backend/.next/static ./.next/static
COPY --from=builder --chown=node:node /workspace/backend/public ./public
USER node
EXPOSE 3108
CMD ["node", "server.js"]
