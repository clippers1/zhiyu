FROM node:22-bookworm-slim
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /workspace/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force
COPY backend/ .
COPY src/ /workspace/src/
COPY public/favicon.svg /workspace/public/favicon.svg
COPY public/content/ /workspace/backend/public/content/
RUN PAYLOAD_SECRET=build-placeholder-not-a-runtime-secret npm run build
ENV NODE_ENV=production
USER node
EXPOSE 3108
CMD ["npm", "run", "start"]
