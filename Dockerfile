FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma

# Skip postinstall during install — full source isn't copied yet.
RUN npm ci --include=optional --ignore-scripts \
  && npm install @tailwindcss/oxide-linux-x64-gnu@4.3.0 @tailwindcss/oxide-linux-x64-musl@4.3.0 --no-save --include=optional --ignore-scripts

COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.ts ./
COPY --from=build /app/scripts ./scripts

EXPOSE 3000

CMD ["npm", "run", "start"]
