FROM node:20-bookworm-slim AS build

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json .npmrc ./

# Reinstall on Linux so Tailwind native bindings match the build platform.
RUN rm -rf node_modules package-lock.json \
  && npm install --include=optional \
  && npm install @tailwindcss/oxide-linux-x64-gnu@4.3.0 @tailwindcss/oxide-linux-x64-musl@4.3.0 --no-save --include=optional

COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.ts ./
COPY --from=build /app/scripts ./scripts

EXPOSE 3000

CMD ["npm", "run", "start"]
