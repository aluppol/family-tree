#!/bin/sh
set -eu

exec python /app/manage.py demo_reset
