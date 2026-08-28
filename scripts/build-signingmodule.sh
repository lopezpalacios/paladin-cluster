#!/usr/bin/env bash
set -euo pipefail

PALADIN_SRC="${PALADIN_SRC:-$HOME/projects/paladin}"
MODULE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/signingmodules/notary-2of2"

if [ ! -d "$PALADIN_SRC" ]; then
  echo "Paladin source checkout not found at $PALADIN_SRC"
  echo "Set PALADIN_SRC to the cloned LFDT-Paladin/paladin repo"
  exit 1
fi

echo "==> Syncing module into paladin tree"
mkdir -p "$PALADIN_SRC/signingmodules/notary-2of2"
rsync -a --delete --exclude node_modules --exclude .git \
  "$MODULE_DIR/" "$PALADIN_SRC/signingmodules/notary-2of2/"

echo "==> Building signing module (.so)"
(
  cd "$PALADIN_SRC/signingmodules/notary-2of2"
  go build -buildmode=c-shared -o libnotary2of2.so .
)
echo "==> Module built: $PALADIN_SRC/signingmodules/notary-2of2/libnotary2of2.so"

echo "==> Building cosigner agent (standalone module, no paladin tree needed)"
(
  cd "$MODULE_DIR/cosigner"
  nix shell nixpkgs#go -c go build -o cosigner .
)
echo "==> Agent built: $PALADIN_SRC/signingmodules/notary-2of2/cosigner/cosigner"

echo "done"
