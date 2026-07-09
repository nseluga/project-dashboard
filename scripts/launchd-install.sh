#!/usr/bin/env bash
set -euo pipefail

PLIST_NAME="com.nateseluga.project-dashboard.plist"
PLIST_SRC="$(cd "$(dirname "$0")/.." && pwd)/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

cp "$PLIST_SRC" "$PLIST_DEST"
launchctl load -w "$PLIST_DEST"

echo "Dashboard service installed. Visit http://localhost:4321"
echo "Logs: /tmp/project-dashboard.log  Errors: /tmp/project-dashboard.err"
