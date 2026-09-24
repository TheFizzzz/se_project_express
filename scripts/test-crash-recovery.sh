#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

export PM2_HOME="${TMPDIR:-/tmp}/wtwr-pm2-${UID}"
export JWT_SECRET="${JWT_SECRET:-local-crash-test-secret-do-not-deploy}"

cleanup() {
  npx pm2 delete wtwr-api >/dev/null 2>&1 || true
  npx pm2 kill >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_for_api() {
  local attempts=40
  while (( attempts > 0 )); do
    if curl --fail --silent --show-error http://127.0.0.1:3001/items >/dev/null; then
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 0.25
  done
  return 1
}

mkdir -p .local-deploy
cleanup
npx pm2 start ecosystem.config.js --env production --update-env >/dev/null

if ! wait_for_api; then
  echo "The API did not become ready. Confirm MongoDB is listening on port 27017."
  npx pm2 logs wtwr-api --lines 30 --nostream
  exit 1
fi

before_pid="$(npx pm2 pid wtwr-api)"
curl --silent --show-error http://127.0.0.1:3001/crash-test >/dev/null || true

if ! wait_for_api; then
  echo "The API did not recover after /crash-test."
  npx pm2 logs wtwr-api --lines 30 --nostream
  exit 1
fi

after_pid="$(npx pm2 pid wtwr-api)"
if [[ -z "$before_pid" || -z "$after_pid" || "$before_pid" == "$after_pid" ]]; then
  echo "PM2 did not report a new process after the crash."
  exit 1
fi

echo "Crash recovery passed: PM2 replaced process $before_pid with $after_pid."
