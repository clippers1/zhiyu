FROM node:22-bookworm-slim
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN PAYLOAD_SECRET=build-placeholder-not-a-runtime-secret npm run build
ENV NODE_ENV=production
USER node
EXPOSE 3108
CMD ["npm", "run", "start"]
