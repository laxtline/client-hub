# ---- ClientHub backend image ----
FROM node:20-alpine

WORKDIR /app

# Prisma's query/schema engines need OpenSSL (libssl) at runtime; the base
# alpine image ships without it, so install it explicitly.
RUN apk add --no-cache openssl libc6-compat

# Install ALL deps (prisma CLI is a devDependency and is needed both to
# generate the client at build time and to run `db push` at boot); prune
# nothing so `npx prisma` resolves the pinned local version instead of
# fetching an arbitrary CLI from the network on every container start.
# The schema must land BEFORE npm ci: package.json's postinstall hook runs
# `prisma generate`, which reads it. Copying it here also means dependency
# layers stay cached when only application source changes.
COPY package*.json ./
COPY src/prisma/schema.prisma ./src/prisma/schema.prisma
RUN npm ci

# Copy the rest of the source (the Prisma client is already generated above).
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# No migration history is committed, so build the schema directly from
# schema.prisma. NOTE: no --accept-data-loss — if the schema drifts in a way
# that would drop data, the boot fails loudly instead of silently destroying
# columns. The seed script self-guards: it skips when data already exists
# (set FORCE_SEED=true to wipe and reseed).
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/prisma/seed.js && node src/server.js"]
