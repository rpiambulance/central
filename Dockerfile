# Rampart Web — production image (target: linux/amd64 for Coolify)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# AUTH_SECRET is only needed to satisfy Auth.js during the build; it is NOT
# persisted into the image (runtime gets the real one from the environment).
RUN AUTH_SECRET=build-placeholder npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
