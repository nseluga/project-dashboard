#!/usr/bin/env bash
set -euo pipefail

PLIST_NAME="com.nateseluga.project-dashboard.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

launchctl unload -w "$PLIST_DEST"
rm "$PLIST_DEST"

echo "Dashboard service removed."
