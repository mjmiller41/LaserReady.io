# LaserReady web — static build in a throwaway Node stage, served by nginx.
# Build context is the REPO ROOT (see docker-compose.yml: context: ..).

FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
# Manifests first for layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/validator/package.json packages/validator/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/validator packages/validator
COPY apps/web apps/web
# MailerLite wiring (M5) is baked at build time; empty = capture forms render disabled.
ARG VITE_ML_ACCOUNT=
ARG VITE_ML_FORM_GUARANTEE=
ARG VITE_ML_FORM_EARLY=
ENV VITE_ML_ACCOUNT=$VITE_ML_ACCOUNT \
    VITE_ML_FORM_GUARANTEE=$VITE_ML_FORM_GUARANTEE \
    VITE_ML_FORM_EARLY=$VITE_ML_FORM_EARLY
RUN pnpm --filter @laserready/web build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
