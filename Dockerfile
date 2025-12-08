FROM docker.io/library/node:22.15.0-alpine3.21 AS drawio-live-editor-dependencies

RUN apk --no-cache add build-base git python3 && \
    rm -rf /var/cache/apk/*

RUN corepack enable pnpm

WORKDIR /app

COPY ./package.json .
COPY ./pnpm-lock.yaml .

RUN pnpm install

FROM drawio-live-editor-dependencies AS drawio-live-editor-builder

COPY . ./

RUN pnpm build

FROM drawio-live-editor-builder AS drawio-live-editor-dev

ENTRYPOINT ["pnpm", "dev"]

FROM nginx:1.28-alpine3.21 AS drawio-live-editor

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=drawio-live-editor-builder /app/dist /usr/share/nginx/html
