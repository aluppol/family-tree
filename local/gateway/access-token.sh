#!/bin/sh
set -eu

printf 'proxy_set_header X-Forwarded-Access-Token "%s";\n' "$(cat /identity/token)" > /etc/nginx/conf.d/access-token.inc
