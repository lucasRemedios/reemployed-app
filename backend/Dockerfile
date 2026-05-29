FROM node:18-alpine

WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
# Copy package files first so this layer is cached until they change.
# npm ci installs exact versions from package-lock.json, including devDeps
# (TypeScript is a devDep and is required for the build step below).
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ─────────────────────────────────────────────────────────────────────
# Copy source files and compile TypeScript → dist/
COPY . .
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
EXPOSE 3001

CMD ["node", "dist/index.js"]
