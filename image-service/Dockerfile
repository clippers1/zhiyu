FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# No dependencies: the service only uses Node built-ins (node:http, fetch,
# node:crypto, node:fs). That keeps the image small and removes any install
# step that could fail during a deploy.
COPY server.mjs admin.mjs ./

RUN mkdir -p /data/out && chown -R node:node /data/out
USER node
ENV IMAGE_OUTPUT_DIR=/data/out
EXPOSE 3120
CMD ["node", "server.mjs"]
