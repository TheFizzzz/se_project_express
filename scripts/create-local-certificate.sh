#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
certificate_dir="$project_root/.local-deploy/certs"
mkdir -p "$certificate_dir"

openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 30 \
  -keyout "$certificate_dir/localhost.key" \
  -out "$certificate_dir/localhost.crt" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Created a 30-day local certificate in .local-deploy/certs."
