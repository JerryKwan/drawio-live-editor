#!/bin/sh
# Substitute specific environment variables into nginx.conf
# We specify variables explicitly to avoid replacing standard nginx variables (like $remote_addr)

# Set default values
export TARGET_BASE_URL=${TARGET_BASE_URL:-"https://api.openai.com/v1"}
export TARGET_API_KEY=${TARGET_API_KEY:-""}
export TARGET_MODEL=${TARGET_MODEL:-""}
export DEBUG_LOG=${DEBUG_LOG:-"false"}

envsubst '${TARGET_BASE_URL} ${TARGET_API_KEY} ${TARGET_MODEL} ${DEBUG_LOG}' < /etc/nginx/templates/nginx.conf.template > /usr/local/openresty/nginx/conf/nginx.conf

exec "$@"
