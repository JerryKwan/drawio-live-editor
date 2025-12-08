FROM openresty/openresty:1.25.3.2-5-bullseye-fat

# Install gettext for envsubst
RUN apt update && apt install -y gettext

# Copy config template
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
