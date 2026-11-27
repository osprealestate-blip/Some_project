# Production image for the VPS (Vercel does not use this file).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# dev dependencies are kept on purpose: next.config.ts is TypeScript and is read when the server starts.
COPY --from=build /app ./
# next start writes its cache here; create it and give it to the node user (fixes EACCES on /app/.next/cache).
RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next/cache
USER node
EXPOSE 3100
CMD ["node_modules/.bin/next", "start", "-p", "3100"]
