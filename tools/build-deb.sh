#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION=$(node -p "JSON.parse(require('fs').readFileSync('$ROOT/package.json', 'utf8')).version")
UNPACKED="$ROOT/dist/linux-unpacked"
OUTPUT="$ROOT/dist/puppy-desktop-pet-${VERSION}.deb"
STAGE=$(mktemp -d)

cleanup() {
  rm -rf "$STAGE"
}
trap cleanup EXIT INT TERM

if [ ! -x "$UNPACKED/puppy-desktop-pet" ]; then
  echo "missing Electron output: $UNPACKED" >&2
  exit 1
fi

mkdir -p "$STAGE/opt" \
  "$STAGE/usr/share/applications" \
  "$STAGE/usr/share/icons/hicolor/256x256/apps"
cp -a "$UNPACKED" "$STAGE/opt/puppy-desktop-pet"
sed "s/^Version: .*/Version: $VERSION/" \
  "$ROOT/packaging/deb/DEBIAN/control" > "$STAGE/DEBIAN.control"
mkdir -p "$STAGE/DEBIAN"
mv "$STAGE/DEBIAN.control" "$STAGE/DEBIAN/control"
cp "$ROOT/packaging/deb/usr/share/applications/puppy-desktop-pet.desktop" \
  "$STAGE/usr/share/applications/puppy-desktop-pet.desktop"
cp "$ROOT/src/renderer/assets/icon.png" \
  "$STAGE/usr/share/icons/hicolor/256x256/apps/puppy-desktop-pet.png"

dpkg-deb --build "$STAGE" "$OUTPUT"
echo "created $OUTPUT"
