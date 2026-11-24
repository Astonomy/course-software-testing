#!/bin/sh
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
if command -v node >/dev/null 2>&1 && node -e "var v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)?0:1)" >/dev/null 2>&1; then
    exec node "$APP_DIR/start.cjs" "$@"
fi
printf '%s\n' 'Error: Node.js 22.12+ was not found. Install it yourself; no dependencies are downloaded.' >&2
printf '%s\n' 'After installing Node.js, retry from this application directory:' '  node start.cjs --port auto' >&2
exit 1
