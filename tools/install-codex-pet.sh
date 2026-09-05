#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CODEX_PETS_DIR=${CODEX_HOME:-${HOME}/.codex}/pets/puppy
mkdir -p "$CODEX_PETS_DIR"
cp "$ROOT/custom-pet/puppy/pet.json" "$CODEX_PETS_DIR/pet.json"
cp "$ROOT/custom-pet/puppy/spritesheet.webp" "$CODEX_PETS_DIR/spritesheet.webp"
echo "installed Codex pet to $CODEX_PETS_DIR"
