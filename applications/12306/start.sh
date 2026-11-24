#!/bin/sh
# Run with: sh start.sh [--host HOST] [--port PORT]
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
for PYTHON in python3 python; do
    if command -v "$PYTHON" >/dev/null 2>&1 && "$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' >/dev/null 2>&1; then
        exec "$PYTHON" "$APP_DIR/start.py" "$@"
    fi
done
printf '%s\n' 'Error: Python 3.8+ was not found. Install Python yourself; this script does not download dependencies.' >&2
printf '%s\n' 'After installing Python, run manually in macOS Terminal or a Linux shell:' >&2
printf '  cd -- "%s"\n' "$(printf '%s' "$APP_DIR" | sed 's/[\"`$\\]/\\&/g')" >&2
printf '%s\n' '  python3 start.py --port auto' >&2
exit 1
