#!/bin/sh

# Default upstreams
export UPSTREAM_FRONTEND=${UPSTREAM_FRONTEND:-"http://drawio-live-editor:8080"}
export UPSTREAM_DRAWIO=${UPSTREAM_DRAWIO:-"http://drawio:8080"}
export UPSTREAM_LLM=${UPSTREAM_LLM:-"http://llm:8080"}

envsubst '${UPSTREAM_FRONTEND} ${UPSTREAM_DRAWIO} ${UPSTREAM_LLM}' < /etc/nginx/templates/nginx.conf.template > /usr/local/openresty/nginx/conf/nginx.conf

exec "$@"
