#!/bin/sh
set -eu

API_PORT="${MINANCE_INTERNAL_API_PORT:-3001}"
WEB_PORT="${PORT:-3000}"
API_ORIGIN="${MINANCE_API_ORIGIN:-http://127.0.0.1:${API_PORT}}"

api_pid=""
web_pid=""

stop_pid() {
  pid="$1"
  if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
    kill "${pid}" 2>/dev/null || true
  fi
}

shutdown() {
  stop_pid "${web_pid}"
  stop_pid "${api_pid}"
  wait "${web_pid}" 2>/dev/null || true
  wait "${api_pid}" 2>/dev/null || true
}

trap 'shutdown; exit 0' INT TERM

PORT="${API_PORT}" node --import tsx/esm services/api/src/server.ts &
api_pid=$!

PORT="${WEB_PORT}" MINANCE_API_ORIGIN="${API_ORIGIN}" pnpm --filter @minance/web start --port "${WEB_PORT}" &
web_pid=$!

exit_code=0
while :; do
  if ! kill -0 "${api_pid}" 2>/dev/null; then
    wait "${api_pid}" || exit_code=$?
    break
  fi

  if ! kill -0 "${web_pid}" 2>/dev/null; then
    wait "${web_pid}" || exit_code=$?
    break
  fi

  sleep 1
done

shutdown
exit "${exit_code}"
