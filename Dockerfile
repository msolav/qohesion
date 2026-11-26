# syntax=docker/dockerfile:1
# Web application image. Build from the repository root:
#   docker build --build-arg QOHESION_COMMIT=$(git rev-parse HEAD) -t qohesion:$(cat VERSION) .

FROM node:22-alpine AS build
WORKDIR /repo
COPY VERSION CHANGELOG.md ./
COPY packages/engine ./packages/engine
COPY packages/ledger ./packages/ledger
COPY packages/roll ./packages/roll
WORKDIR /repo/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web ./
ARG QOHESION_COMMIT=""
ENV QOHESION_COMMIT=${QOHESION_COMMIT}
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
# The build bundles the application and the packages it uses; nothing else is needed at run time.
COPY --from=build /repo/apps/web/build ./build
RUN printf '{"type":"module"}\n' > package.json
# Writable folder for the test edition's database (QOHESION_DATA_DIR). Unused unless that edition is enabled.
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/version || exit 1
CMD ["node", "build"]
